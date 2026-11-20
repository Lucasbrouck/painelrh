-- PostgreSQL Schema for Employee Rewards App (27 Tables + Indexes)

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adminName TEXT NOT NULL,
  adminEmail TEXT NOT NULL,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  checkinRadius INTEGER DEFAULT 200,
  saipos_token TEXT,
  ignore_ficha_venda INTEGER DEFAULT 0,
  legal_name TEXT,
  cnpj TEXT,
  address TEXT,
  city_uf TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'worker', 'manager')),
  plataBalance DOUBLE PRECISION DEFAULT 0,
  isFirstAccess INTEGER DEFAULT 1,
  resetToken TEXT,
  resetTokenExpires TEXT,
  training_level_id TEXT,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  pdfObs TEXT,
  maquininhaOnboarding INTEGER DEFAULT 0,
  nfc_id TEXT,
  recebeJae INTEGER DEFAULT 0,
  elegivelPremio INTEGER DEFAULT 1,
  ignore_admission_docs INTEGER DEFAULT 0,
  ignore_first_access INTEGER DEFAULT 0,
  hiringDate TEXT,
  documents TEXT,
  cajaUserId TEXT,
  cajaRole TEXT,
  timesheetHeader TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DAY', 'NIGHT')),
  revenue DOUBLE PRECISION NOT NULL,
  metricCMV DOUBLE PRECISION,
  metricRATING DOUBLE PRECISION,
  metricOPS DOUBLE PRECISION,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS shift_workers (
  shiftId TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE', 'INELIGIBLE')),
  eligible INTEGER DEFAULT 1,
  PRIMARY KEY (shiftId, userId)
);

CREATE TABLE IF NOT EXISTS advances (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS absences (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT,
  excused INTEGER DEFAULT 0,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  certificate_url TEXT,
  justification_status TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT 'default',
  month TEXT,
  revenueGoal DOUBLE PRECISION NOT NULL,
  revenueSuperGoal DOUBLE PRECISION NOT NULL,
  cmvGoal DOUBLE PRECISION NOT NULL,
  cmvSuperGoal DOUBLE PRECISION NOT NULL,
  ratingGoal DOUBLE PRECISION NOT NULL,
  ratingSuperGoal DOUBLE PRECISION NOT NULL,
  opsGoal DOUBLE PRECISION NOT NULL,
  opsSuperGoal DOUBLE PRECISION NOT NULL,
  company_id TEXT,
  updatedAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  locked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_metrics (
  date TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'default-company',
  cmv DOUBLE PRECISION,
  rating DOUBLE PRECISION,
  ops DOUBLE PRECISION,
  PRIMARY KEY (date, company_id)
);

CREATE TABLE IF NOT EXISTS training_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id TEXT DEFAULT 'SYSTEM',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS training_groups (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  platas DOUBLE PRECISION DEFAULT 0,
  company_id TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS training_levels (
  id TEXT PRIMARY KEY,
  order_index INTEGER,
  name TEXT,
  description TEXT,
  icon TEXT,
  group_id TEXT,
  platas DOUBLE PRECISION DEFAULT 0,
  company_id TEXT
);

CREATE TABLE IF NOT EXISTS pdi_models (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  company_id TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS pdi_questions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('CULTURAL', 'OPERATIONAL', 'OPEN')),
  roles TEXT DEFAULT '["all"]',
  active INTEGER DEFAULT 1,
  model_id TEXT REFERENCES pdi_models(id) ON DELETE CASCADE,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS pdi_evaluations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING_SELF',
  completed_at TEXT,
  model_id TEXT,
  focus_op_id TEXT,
  focus_op_comment TEXT,
  focus_cult_id TEXT,
  focus_cult_comment TEXT,
  final_comment TEXT,
  user_viewed TEXT,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS pdi_answers (
  id TEXT PRIMARY KEY,
  evaluation_id INTEGER REFERENCES pdi_evaluations(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questionId TEXT NOT NULL REFERENCES pdi_questions(id) ON DELETE CASCADE,
  selfScore INTEGER,
  selfComment TEXT,
  admScore INTEGER,
  admComment TEXT,
  date TEXT NOT NULL,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS plata_transactions (
  id TEXT PRIMARY KEY,
  fromUserId TEXT,
  toUserId TEXT,
  amount DOUBLE PRECISION NOT NULL CHECK(amount > 0),
  description TEXT,
  timestamp TEXT NOT NULL,
  hash TEXT NOT NULL,
  company_id TEXT,
  notified INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS streaks_config (
  id TEXT PRIMARY KEY,
  days_required INTEGER DEFAULT 20,
  plata_reward DOUBLE PRECISION DEFAULT 100,
  bonus_no_absences DOUBLE PRECISION DEFAULT 0,
  bonus_no_lateness DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS streak_rewards_claimed (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  month TEXT NOT NULL,
  company_id TEXT,
  UNIQUE(userId, month)
);

CREATE TABLE IF NOT EXISTS user_daily_access (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  company_id TEXT,
  UNIQUE(userId, date)
);

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  type TEXT DEFAULT 'OUTSOURCED'
);

CREATE TABLE IF NOT EXISTS driver_scales (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS driver_checkins (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE')),
  is_double INTEGER DEFAULT 0,
  deliveries INTEGER DEFAULT 0,
  fees INTEGER DEFAULT 0,
  total_value DOUBLE PRECISION DEFAULT 0,
  active INTEGER DEFAULT 1,
  cancellation_reason TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  minutes_late INTEGER DEFAULT 0,
  discounted_hours INTEGER DEFAULT 0,
  checkout_status TEXT,
  minutes_early INTEGER DEFAULT 0,
  entry_time TEXT,
  exit_time TEXT,
  scale_id TEXT,
  double_scale_id TEXT
);

CREATE TABLE IF NOT EXISTS driver_configs (
  id TEXT PRIMARY KEY,
  daily_rate DOUBLE PRECISION DEFAULT 0,
  delivery_rate DOUBLE PRECISION DEFAULT 0,
  fee_rate DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS driver_payments (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  active INTEGER DEFAULT 1,
  cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS user_checkins (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  date TEXT NOT NULL,
  shiftType TEXT CHECK(shiftType IN ('DAY', 'NIGHT')),
  checkinEntry TEXT,
  checkoutBreak TEXT,
  checkinBreak TEXT,
  checkoutExit TEXT,
  status TEXT CHECK(status IN ('ON_TIME', 'LATE')),
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  isDouble INTEGER DEFAULT 0,
  checkinDouble TEXT,
  checkoutExit2 TEXT,
  UNIQUE(userId, date)
);

CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  icon TEXT,
  company_id TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS store_purchases (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  itemId TEXT NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  priceAtPurchase DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'CANCELLED')),
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date);
CREATE INDEX IF NOT EXISTS idx_absences_userId ON absences(userId);
CREATE INDEX IF NOT EXISTS idx_advances_date ON advances(date);
CREATE INDEX IF NOT EXISTS idx_advances_userId ON advances(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_checkins_active_unique ON driver_checkins(driver_id, date) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_driver_checkins_date ON driver_checkins(date);
CREATE INDEX IF NOT EXISTS idx_plata_from ON plata_transactions(fromUserId);
CREATE INDEX IF NOT EXISTS idx_plata_hash ON plata_transactions(hash);
CREATE INDEX IF NOT EXISTS idx_plata_timestamp ON plata_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_plata_to ON plata_transactions(toUserId);
CREATE INDEX IF NOT EXISTS idx_shift_workers_userId ON shift_workers(userId);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_store_purchases_company ON store_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_user ON store_purchases(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cajaUserId ON users(cajaUserId) WHERE cajaUserId IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nfc_id ON users(nfc_id) WHERE nfc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

CREATE TABLE IF NOT EXISTS disciplinary_rules (
  id TEXT PRIMARY KEY,
  code TEXT,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  company_id TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS disciplinary_records (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('ORIENTATION', 'VERBAL_WARNING', 'WRITTEN_WARNING', 'SUSPENSION')),
  rule_id TEXT,
  rule_title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  suspension_days INTEGER DEFAULT 0,
  suspension_start_date TEXT,
  document_url TEXT,
  document_name TEXT,
  created_by TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_user ON disciplinary_records(userId);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_company ON disciplinary_records(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_date ON disciplinary_records(date);

-- Canal de Escuta e Denuncia (NR-1 e NR-5 / Lei 14.457/2022)
CREATE TABLE IF NOT EXISTS whistleblower_reports (
  id TEXT PRIMARY KEY,
  protocol TEXT UNIQUE NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 1,
  reporter_user_id TEXT,
  reporter_name TEXT,
  reporter_contact TEXT,
  reporter_role TEXT,
  company_id TEXT,
  norm_reference TEXT NOT NULL DEFAULT 'NR5',
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIUM',
  title TEXT,
  description TEXT NOT NULL,
  incident_date TEXT,
  incident_location TEXT,
  involved_people TEXT,
  witnesses_info TEXT,
  evidence_attachment TEXT,
  anonymity_hash TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  internal_notes TEXT,
  action_plan TEXT,
  resolution_summary TEXT,
  assigned_to TEXT,
  sla_due_date TEXT,
  resolved_at TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updatedAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS whistleblower_messages (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES whistleblower_reports(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_label TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_wb_reports_protocol ON whistleblower_reports(protocol);
CREATE INDEX IF NOT EXISTS idx_wb_reports_company ON whistleblower_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_wb_reports_status ON whistleblower_reports(status);
CREATE INDEX IF NOT EXISTS idx_wb_messages_report ON whistleblower_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_wb_messages_protocol ON whistleblower_messages(protocol);

-- Portal de Vagas e Banco de Curriculos (Kanban)
CREATE TABLE IF NOT EXISTS job_openings (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  role_category TEXT,
  company_id TEXT,
  shift_type TEXT DEFAULT 'FLEXIBLE',
  employment_type TEXT DEFAULT 'CLT',
  salary_range TEXT,
  benefits TEXT,
  description TEXT,
  requirements TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  custom_fields TEXT DEFAULT '[]',
  created_by TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updatedAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  protocol TEXT UNIQUE NOT NULL,
  job_id TEXT,
  job_title TEXT,
  company_id TEXT,
  candidate_name TEXT NOT NULL,
  candidate_whatsapp TEXT NOT NULL,
  candidate_email TEXT,
  birth_date TEXT,
  neighborhood TEXT,
  city TEXT,
  transport_mode TEXT,
  shift_availability TEXT,
  start_availability TEXT,
  has_restaurant_experience INTEGER DEFAULT 0,
  experience_summary TEXT,
  motivation TEXT,
  resume_url TEXT,
  resume_filename TEXT,
  custom_answers TEXT DEFAULT '{}',
  stage TEXT NOT NULL DEFAULT 'NEW',
  rating INTEGER DEFAULT 0,
  tags TEXT,
  rh_notes TEXT,
  discard_reason TEXT,
  hired_user_id TEXT,
  hired_at TEXT,
  stage_updated_at TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updatedAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_job_openings_slug ON job_openings(slug);
CREATE INDEX IF NOT EXISTS idx_job_openings_company ON job_openings(company_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_status ON job_openings(status);
CREATE INDEX IF NOT EXISTS idx_job_apps_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_company ON job_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_stage ON job_applications(stage);


