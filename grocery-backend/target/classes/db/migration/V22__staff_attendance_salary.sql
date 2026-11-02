-- Phase 5: staff attendance and monthly salary. Additive only, no data loss.
ALTER TABLE users ADD COLUMN monthly_salary DECIMAL(10,2) NULL;

CREATE TABLE attendance (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  attendance_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  notes VARCHAR(255) NULL,
  recorded_by BIGINT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_attendance_user_date (user_id, attendance_date),
  KEY idx_attendance_date (attendance_date),
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_attendance_recorded_by FOREIGN KEY (recorded_by) REFERENCES users (id)
);

CREATE TABLE salary_payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  salary_month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(10,2) NOT NULL,
  working_days INT NOT NULL DEFAULT 0,
  present_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  half_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  leave_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  absent_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_payable DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL,
  paid_on DATE NULL,
  notes VARCHAR(255) NULL,
  created_by BIGINT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_salary_user_month (user_id, salary_month),
  CONSTRAINT fk_salary_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_salary_created_by FOREIGN KEY (created_by) REFERENCES users (id)
);
