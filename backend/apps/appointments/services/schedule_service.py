"""
Schedule Service for MediConnect Appointments.

Handles doctor schedule management and availability checking.
"""

import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.appointments.models import DoctorSchedule, ScheduleException

logger = logging.getLogger(__name__)


class ScheduleService:
    """Service for managing doctor schedules."""
    
    @staticmethod
    def get_doctor_schedule(doctor, day_of_week: int) -> Optional[DoctorSchedule]:
        """
        Get doctor's schedule for a specific day of week.
        
        Args:
            doctor: Doctor user instance
            day_of_week: 0=Monday, 6=Sunday
            
        Returns:
            DoctorSchedule or None
        """
        try:
            return DoctorSchedule.objects.get(
                doctor=doctor,
                day_of_week=day_of_week,
                is_active=True
            )
        except DoctorSchedule.DoesNotExist:
            return None
    
    @staticmethod
    def get_weekly_schedule(doctor) -> List[DoctorSchedule]:
        """
        Get doctor's complete weekly schedule.
        
        Args:
            doctor: Doctor user instance
            
        Returns:
            List of DoctorSchedule objects
        """
        return list(DoctorSchedule.objects.filter(
            doctor=doctor,
            is_active=True
        ).order_by('day_of_week'))
    
    @staticmethod
    def get_schedule_exception(doctor, exception_date: date) -> Optional[ScheduleException]:
        """
        Get schedule exception for a specific date.
        
        Args:
            doctor: Doctor user instance
            exception_date: Date to check
            
        Returns:
            ScheduleException or None
        """
        try:
            return ScheduleException.objects.get(
                doctor=doctor,
                exception_date=exception_date
            )
        except ScheduleException.DoesNotExist:
            return None
    
    @staticmethod
    def is_doctor_available_on_date(doctor, check_date: date) -> Tuple[bool, Optional[str]]:
        """
        Check if doctor is available on a specific date.
        
        Args:
            doctor: Doctor user instance
            check_date: Date to check
            
        Returns:
            Tuple of (is_available, reason_if_not)
        """
        # Check for exceptions first
        exception = ScheduleService.get_schedule_exception(doctor, check_date)
        
        if exception:
            if exception.exception_type == 'leave':
                return False, f"Doctor is on leave: {exception.reason or 'Not specified'}"
            elif exception.exception_type in ['modified', 'extra']:
                return True, None
        
        # Check regular schedule
        day_of_week = check_date.weekday()
        schedule = ScheduleService.get_doctor_schedule(doctor, day_of_week)
        
        if not schedule:
            day_name = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                       'Friday', 'Saturday', 'Sunday'][day_of_week]
            return False, f"Doctor does not work on {day_name}"
        
        return True, None
    
    @staticmethod
    def get_working_hours(doctor, check_date: date) -> Optional[Dict]:
        """
        Get working hours for a specific date (considering exceptions).
        
        Args:
            doctor: Doctor user instance
            check_date: Date to check
            
        Returns:
            Dict with start_time, end_time, break_start, break_end, slot_duration
            or None if not working
        """
        # Check for exceptions first
        exception = ScheduleService.get_schedule_exception(doctor, check_date)
        
        if exception:
            if exception.exception_type == 'leave':
                return None
            elif exception.exception_type in ['modified', 'extra']:
                # Get base schedule for slot duration
                day_of_week = check_date.weekday()
                base_schedule = ScheduleService.get_doctor_schedule(doctor, day_of_week)
                slot_duration = base_schedule.slot_duration_minutes if base_schedule else 30
                max_patients = base_schedule.max_patients_per_slot if base_schedule else 1
                
                return {
                    'start_time': exception.start_time,
                    'end_time': exception.end_time,
                    'break_start': None,
                    'break_end': None,
                    'slot_duration_minutes': slot_duration,
                    'max_patients_per_slot': max_patients,
                    'consultation_fee': base_schedule.consultation_fee if base_schedule else None,
                }
        
        # Regular schedule
        day_of_week = check_date.weekday()
        schedule = ScheduleService.get_doctor_schedule(doctor, day_of_week)
        
        if not schedule:
            return None
        
        return {
            'start_time': schedule.start_time,
            'end_time': schedule.end_time,
            'break_start': schedule.break_start,
            'break_end': schedule.break_end,
            'slot_duration_minutes': schedule.slot_duration_minutes,
            'max_patients_per_slot': schedule.max_patients_per_slot,
            'consultation_fee': schedule.consultation_fee,
        }
    
    @staticmethod
    @transaction.atomic
    def create_schedule(doctor, schedule_data: List[Dict]) -> List[DoctorSchedule]:
        """
        Create or update weekly schedule for doctor.
        
        Args:
            doctor: Doctor user instance
            schedule_data: List of schedule dicts with day_of_week, start_time, etc.
            
        Returns:
            List of created/updated DoctorSchedule objects
        """
        schedules = []
        
        for data in schedule_data:
            day_of_week = data.get('day_of_week')
            
            schedule, created = DoctorSchedule.objects.update_or_create(
                doctor=doctor,
                day_of_week=day_of_week,
                defaults={
                    'start_time': data.get('start_time'),
                    'end_time': data.get('end_time'),
                    'break_start': data.get('break_start'),
                    'break_end': data.get('break_end'),
                    'slot_duration_minutes': data.get('slot_duration_minutes', 30),
                    'max_patients_per_slot': data.get('max_patients_per_slot', 1),
                    'consultation_fee': data.get('consultation_fee'),
                    'is_active': data.get('is_active', True),
                }
            )
            schedules.append(schedule)
            
            action = 'Created' if created else 'Updated'
            logger.info(f"{action} schedule for Dr. {doctor.get_full_name()} - Day {day_of_week}")
        
        return schedules
    
    @staticmethod
    @transaction.atomic
    def create_exception(
        doctor,
        exception_date: date,
        exception_type: str,
        start_time=None,
        end_time=None,
        reason: str = ''
    ) -> ScheduleException:
        """
        Create schedule exception (leave or modified hours).
        
        Args:
            doctor: Doctor user instance
            exception_date: Date of exception
            exception_type: 'leave', 'modified', or 'extra'
            start_time: Start time for modified/extra
            end_time: End time for modified/extra
            reason: Reason for exception
            
        Returns:
            ScheduleException object
        """
        exception, created = ScheduleException.objects.update_or_create(
            doctor=doctor,
            exception_date=exception_date,
            defaults={
                'exception_type': exception_type,
                'start_time': start_time,
                'end_time': end_time,
                'reason': reason,
            }
        )
        
        action = 'Created' if created else 'Updated'
        logger.info(
            f"{action} exception for Dr. {doctor.get_full_name()} - "
            f"{exception_date} ({exception_type})"
        )
        
        return exception
    
    @staticmethod
    def get_upcoming_exceptions(doctor, days: int = 30) -> List[ScheduleException]:
        """
        Get upcoming schedule exceptions.
        
        Args:
            doctor: Doctor user instance
            days: Number of days to look ahead
            
        Returns:
            List of ScheduleException objects
        """
        today = timezone.now().date()
        end_date = today + timedelta(days=days)
        
        return list(ScheduleException.objects.filter(
            doctor=doctor,
            exception_date__gte=today,
            exception_date__lte=end_date
        ).order_by('exception_date'))
    
    @staticmethod
    def get_available_days(doctor, start_date: date, days: int = 30) -> List[Dict]:
        """
        Get list of available days for booking.
        
        Args:
            doctor: Doctor user instance
            start_date: Start date
            days: Number of days to check
            
        Returns:
            List of dicts with date and availability info
        """
        available_days = []
        
        for i in range(days):
            check_date = start_date + timedelta(days=i)
            is_available, reason = ScheduleService.is_doctor_available_on_date(
                doctor, check_date
            )
            
            available_days.append({
                'date': check_date,
                'day_name': check_date.strftime('%A'),
                'is_available': is_available,
                'reason': reason,
            })
        
        return available_days