"""
Slot Service for MediConnect Appointments.

Handles time slot generation and management.
"""

import logging
from datetime import datetime, timedelta, date, time
from typing import List, Dict, Optional
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone

from apps.appointments.models import TimeSlot, DoctorSchedule
from apps.appointments.services.schedule_service import ScheduleService

logger = logging.getLogger(__name__)


class SlotService:
    """Service for managing time slots."""
    
    @staticmethod
    def generate_time_slots(
        start_time: time,
        end_time: time,
        duration_minutes: int,
        break_start: time = None,
        break_end: time = None
    ) -> List[Dict]:
        """
        Generate time slots between start and end time.
        
        Args:
            start_time: Start time
            end_time: End time
            duration_minutes: Duration of each slot
            break_start: Break start time (optional)
            break_end: Break end time (optional)
            
        Returns:
            List of dicts with start_time and end_time
        """
        slots = []
        
        # Convert to datetime for easier calculation
        base_date = datetime.today()
        current = datetime.combine(base_date, start_time)
        end = datetime.combine(base_date, end_time)
        
        if break_start and break_end:
            break_start_dt = datetime.combine(base_date, break_start)
            break_end_dt = datetime.combine(base_date, break_end)
        else:
            break_start_dt = None
            break_end_dt = None
        
        while current + timedelta(minutes=duration_minutes) <= end:
            slot_end = current + timedelta(minutes=duration_minutes)
            
            # Skip if slot overlaps with break
            if break_start_dt and break_end_dt:
                if current < break_end_dt and slot_end > break_start_dt:
                    # Move to after break
                    current = break_end_dt
                    continue
            
            slots.append({
                'start_time': current.time(),
                'end_time': slot_end.time(),
            })
            
            current = slot_end
        
        return slots
    
    @staticmethod
    @transaction.atomic
    def generate_slots_for_date(doctor, slot_date: date) -> List[TimeSlot]:
        """
        Generate time slots for a specific date.
        
        Args:
            doctor: Doctor user instance
            slot_date: Date to generate slots for
            
        Returns:
            List of TimeSlot objects
        """
        # Get working hours for this date
        working_hours = ScheduleService.get_working_hours(doctor, slot_date)
        
        if not working_hours:
            logger.info(f"No working hours for Dr. {doctor.get_full_name()} on {slot_date}")
            return []
        
        # Delete existing available slots for this date (keep booked ones)
        TimeSlot.objects.filter(
            doctor=doctor,
            slot_date=slot_date,
            status='available',
            current_bookings=0
        ).delete()
        
        # Generate slots
        slot_times = SlotService.generate_time_slots(
            start_time=working_hours['start_time'],
            end_time=working_hours['end_time'],
            duration_minutes=working_hours['slot_duration_minutes'],
            break_start=working_hours.get('break_start'),
            break_end=working_hours.get('break_end'),
        )
        
        slots = []
        for slot_time in slot_times:
            # Check if slot already exists
            existing = TimeSlot.objects.filter(
                doctor=doctor,
                slot_date=slot_date,
                start_time=slot_time['start_time']
            ).first()
            
            if existing:
                slots.append(existing)
                continue
            
            slot = TimeSlot.objects.create(
                doctor=doctor,
                slot_date=slot_date,
                start_time=slot_time['start_time'],
                end_time=slot_time['end_time'],
                max_bookings=working_hours['max_patients_per_slot'],
                status='available',
            )
            slots.append(slot)
        
        logger.info(
            f"Generated {len(slots)} slots for Dr. {doctor.get_full_name()} on {slot_date}"
        )
        
        return slots
    
    @staticmethod
    @transaction.atomic
    def generate_slots_for_range(
        doctor,
        start_date: date,
        days: int = 7
    ) -> Dict[date, List[TimeSlot]]:
        """
        Generate time slots for a date range.
        
        Args:
            doctor: Doctor user instance
            start_date: Start date
            days: Number of days
            
        Returns:
            Dict with date as key and list of TimeSlot as value
        """
        result = {}
        
        for i in range(days):
            slot_date = start_date + timedelta(days=i)
            
            # Skip past dates
            if slot_date < timezone.now().date():
                continue
            
            slots = SlotService.generate_slots_for_date(doctor, slot_date)
            if slots:
                result[slot_date] = slots
        
        return result
    
    @staticmethod
    def get_available_slots(
        doctor,
        slot_date: date,
        include_booked: bool = False
    ) -> List[TimeSlot]:
        """
        Get available slots for a date.
        
        Args:
            doctor: Doctor user instance
            slot_date: Date to check
            include_booked: Include booked slots in result
            
        Returns:
            List of TimeSlot objects
        """
        queryset = TimeSlot.objects.filter(
            doctor=doctor,
            slot_date=slot_date
        ).order_by('start_time')
        
        if not include_booked:
            queryset = queryset.filter(status='available')
            # Also filter out past slots
            if slot_date == timezone.now().date():
                current_time = timezone.now().time()
                queryset = queryset.filter(start_time__gt=current_time)
        
        return list(queryset)
    
    @staticmethod
    def get_next_available_slot(doctor, from_date: date = None) -> Optional[TimeSlot]:
        """
        Get next available slot for a doctor.
        
        Args:
            doctor: Doctor user instance
            from_date: Start searching from this date
            
        Returns:
            TimeSlot or None
        """
        if from_date is None:
            from_date = timezone.now().date()
        
        current_time = timezone.now().time() if from_date == timezone.now().date() else None
        
        queryset = TimeSlot.objects.filter(
            doctor=doctor,
            slot_date__gte=from_date,
            status='available'
        ).order_by('slot_date', 'start_time')
        
        if current_time:
            # For today, only get future slots
            queryset = queryset.exclude(
                Q(slot_date=from_date) & Q(start_time__lte=current_time)
            )
        
        return queryset.first()
    
    @staticmethod
    @transaction.atomic
    def book_slot(slot: TimeSlot) -> bool:
        """
        Book a time slot.
        
        Args:
            slot: TimeSlot to book
            
        Returns:
            True if successful
        """
        if not slot.is_available:
            return False
        
        slot.current_bookings = F('current_bookings') + 1
        slot.save()
        
        # Refresh to get updated value
        slot.refresh_from_db()
        
        if slot.current_bookings >= slot.max_bookings:
            slot.status = 'booked'
            slot.save()
        
        logger.info(f"Booked slot {slot.id} - Bookings: {slot.current_bookings}/{slot.max_bookings}")
        
        return True
    
    @staticmethod
    @transaction.atomic
    def release_slot(slot: TimeSlot) -> bool:
        """
        Release a booking from time slot.
        
        Args:
            slot: TimeSlot to release booking from
            
        Returns:
            True if successful
        """
        if slot.current_bookings <= 0:
            return False
        
        slot.current_bookings = F('current_bookings') - 1
        slot.save()
        
        # Refresh to get updated value
        slot.refresh_from_db()
        
        if slot.status == 'booked' and slot.current_bookings < slot.max_bookings:
            slot.status = 'available'
            slot.save()
        
        logger.info(f"Released slot {slot.id} - Bookings: {slot.current_bookings}/{slot.max_bookings}")
        
        return True
    
    @staticmethod
    @transaction.atomic
    def block_slot(slot: TimeSlot, reason: str = '') -> bool:
        """
        Block a time slot.
        
        Args:
            slot: TimeSlot to block
            reason: Reason for blocking
            
        Returns:
            True if successful
        """
        if slot.current_bookings > 0:
            logger.warning(f"Cannot block slot {slot.id} - has existing bookings")
            return False
        
        slot.status = 'blocked'
        slot.save()
        
        logger.info(f"Blocked slot {slot.id}")
        
        return True
    
    @staticmethod
    @transaction.atomic
    def unblock_slot(slot: TimeSlot) -> bool:
        """
        Unblock a time slot.
        
        Args:
            slot: TimeSlot to unblock
            
        Returns:
            True if successful
        """
        if slot.status != 'blocked':
            return False
        
        slot.status = 'available'
        slot.save()
        
        logger.info(f"Unblocked slot {slot.id}")
        
        return True
    
    @staticmethod
    def cleanup_past_slots(days_old: int = 30) -> int:
        """
        Delete old past slots.
        
        Args:
            days_old: Delete slots older than this many days
            
        Returns:
            Number of slots deleted
        """
        cutoff_date = timezone.now().date() - timedelta(days=days_old)
        
        deleted_count, _ = TimeSlot.objects.filter(
            slot_date__lt=cutoff_date
        ).delete()
        
        logger.info(f"Cleaned up {deleted_count} old slots")
        
        return deleted_count