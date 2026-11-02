package com.groceryshop.staff;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    List<Attendance> findByAttendanceDate(LocalDate date);

    List<Attendance> findByAttendanceDateBetween(LocalDate start, LocalDate end);

    Optional<Attendance> findByUserIdAndAttendanceDate(Long userId, LocalDate date);
}
