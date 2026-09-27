const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const dbName = process.env.DB_NAME || 'studentsdb';
const dbPath = path.resolve(__dirname, dbName);
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Create students table
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    gender TEXT DEFAULT 'Other',
    dob TEXT DEFAULT '',
    department TEXT NOT NULL,
    year_level TEXT NOT NULL,
    gpa REAL DEFAULT 0.0,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department);
  CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
  CREATE INDEX IF NOT EXISTS idx_students_year ON students(year_level);
  CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
  CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
`);

// Sample data
const SAMPLE_STUDENTS = [
  {
    student_id: 'STU-2024-0001',
    first_name: 'Alex',
    last_name: 'Rivera',
    email: 'alex.rivera@university.edu',
    phone: '+1 (555) 234-5678',
    gender: 'Male',
    dob: '2003-04-12',
    department: 'Computer Science',
    year_level: '3rd Year',
    gpa: 3.85,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0002',
    first_name: 'Sophia',
    last_name: 'Chen',
    email: 'sophia.chen@university.edu',
    phone: '+1 (555) 345-6789',
    gender: 'Female',
    dob: '2004-08-23',
    department: 'Computer Science',
    year_level: '2nd Year',
    gpa: 3.92,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0003',
    first_name: 'Marcus',
    last_name: 'Johnson',
    email: 'marcus.j@university.edu',
    phone: '+1 (555) 456-7890',
    gender: 'Male',
    dob: '2002-11-05',
    department: 'Engineering',
    year_level: '4th Year',
    gpa: 3.65,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0004',
    first_name: 'Emma',
    last_name: 'Watson',
    email: 'emma.watson@university.edu',
    phone: '+1 (555) 567-8901',
    gender: 'Female',
    dob: '2001-09-17',
    department: 'Business Administration',
    year_level: '5th Year',
    gpa: 3.78,
    status: 'Graduated',
  },
  {
    student_id: 'STU-2024-0005',
    first_name: 'Liam',
    last_name: 'Smith',
    email: 'liam.smith@university.edu',
    phone: '+1 (555) 678-9012',
    gender: 'Male',
    dob: '2005-02-14',
    department: 'Mathematics',
    year_level: '1st Year',
    gpa: 3.40,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0006',
    first_name: 'Olivia',
    last_name: 'Garcia',
    email: 'olivia.g@university.edu',
    phone: '+1 (555) 789-0123',
    gender: 'Female',
    dob: '2003-07-29',
    department: 'Biology',
    year_level: '3rd Year',
    gpa: 3.95,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0007',
    first_name: 'Noah',
    last_name: 'Patel',
    email: 'noah.patel@university.edu',
    phone: '+1 (555) 890-1234',
    gender: 'Male',
    dob: '2004-01-19',
    department: 'Physics',
    year_level: '2nd Year',
    gpa: 2.85,
    status: 'On Leave',
  },
  {
    student_id: 'STU-2024-0008',
    first_name: 'Ava',
    last_name: 'Kim',
    email: 'ava.kim@university.edu',
    phone: '+1 (555) 901-2345',
    gender: 'Female',
    dob: '2002-05-30',
    department: 'Chemistry',
    year_level: '4th Year',
    gpa: 3.52,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0009',
    first_name: 'Ethan',
    last_name: 'Davis',
    email: 'ethan.davis@university.edu',
    phone: '+1 (555) 012-3456',
    gender: 'Male',
    dob: '2004-10-10',
    department: 'Economics',
    year_level: '2nd Year',
    gpa: 3.10,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0010',
    first_name: 'Isabella',
    last_name: 'Martinez',
    email: 'isabella.m@university.edu',
    phone: '+1 (555) 123-4560',
    gender: 'Female',
    dob: '2003-12-04',
    department: 'Psychology',
    year_level: '3rd Year',
    gpa: 3.70,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0011',
    first_name: 'Lucas',
    last_name: 'Taylor',
    email: 'lucas.taylor@university.edu',
    phone: '+1 (555) 234-5601',
    gender: 'Male',
    dob: '2005-06-18',
    department: 'Literature',
    year_level: '1st Year',
    gpa: 3.25,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0012',
    first_name: 'Mia',
    last_name: 'Anderson',
    email: 'mia.anderson@university.edu',
    phone: '+1 (555) 345-6702',
    gender: 'Female',
    dob: '2002-03-25',
    department: 'Computer Science',
    year_level: '4th Year',
    gpa: 3.88,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0013',
    first_name: 'Benjamin',
    last_name: 'Thomas',
    email: 'ben.thomas@university.edu',
    phone: '+1 (555) 456-7803',
    gender: 'Male',
    dob: '2003-08-11',
    department: 'Engineering',
    year_level: '3rd Year',
    gpa: 2.45,
    status: 'Suspended',
  },
  {
    student_id: 'STU-2024-0014',
    first_name: 'Charlotte',
    last_name: 'White',
    email: 'charlotte.w@university.edu',
    phone: '+1 (555) 567-8904',
    gender: 'Female',
    dob: '2001-11-20',
    department: 'Business Administration',
    year_level: '5th Year',
    gpa: 3.90,
    status: 'Graduated',
  },
  {
    student_id: 'STU-2024-0015',
    first_name: 'Elijah',
    last_name: 'Harris',
    email: 'elijah.harris@university.edu',
    phone: '+1 (555) 678-9015',
    gender: 'Male',
    dob: '2004-04-05',
    department: 'Mathematics',
    year_level: '2nd Year',
    gpa: 3.60,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0016',
    first_name: 'Amelia',
    last_name: 'Martin',
    email: 'amelia.martin@university.edu',
    phone: '+1 (555) 789-0126',
    gender: 'Female',
    dob: '2005-09-09',
    department: 'Physics',
    year_level: '1st Year',
    gpa: 3.15,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0017',
    first_name: 'Daniel',
    last_name: 'Lee',
    email: 'daniel.lee@university.edu',
    phone: '+1 (555) 890-1237',
    gender: 'Male',
    dob: '2003-01-30',
    department: 'Chemistry',
    year_level: '3rd Year',
    gpa: 3.42,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0018',
    first_name: 'Harper',
    last_name: 'Clark',
    email: 'harper.clark@university.edu',
    phone: '+1 (555) 901-2348',
    gender: 'Female',
    dob: '2004-12-15',
    department: 'Biology',
    year_level: '2nd Year',
    gpa: 3.75,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0019',
    first_name: 'Henry',
    last_name: 'Rodriguez',
    email: 'henry.r@university.edu',
    phone: '+1 (555) 012-3459',
    gender: 'Male',
    dob: '2002-07-07',
    department: 'Economics',
    year_level: '4th Year',
    gpa: 2.90,
    status: 'On Leave',
  },
  {
    student_id: 'STU-2024-0020',
    first_name: 'Evelyn',
    last_name: 'Lewis',
    email: 'evelyn.lewis@university.edu',
    phone: '+1 (555) 123-4570',
    gender: 'Female',
    dob: '2005-03-22',
    department: 'Psychology',
    year_level: '1st Year',
    gpa: 3.55,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0021',
    first_name: 'Sebastian',
    last_name: 'Walker',
    email: 'sebastian.w@university.edu',
    phone: '+1 (555) 234-5681',
    gender: 'Male',
    dob: '2003-10-14',
    department: 'Literature',
    year_level: '3rd Year',
    gpa: 3.38,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0022',
    first_name: 'Aria',
    last_name: 'Hall',
    email: 'aria.hall@university.edu',
    phone: '+1 (555) 345-6792',
    gender: 'Female',
    dob: '2004-05-18',
    department: 'Computer Science',
    year_level: '2nd Year',
    gpa: 3.82,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0023',
    first_name: 'Jack',
    last_name: 'Young',
    email: 'jack.young@university.edu',
    phone: '+1 (555) 456-7893',
    gender: 'Male',
    dob: '2002-02-28',
    department: 'Engineering',
    year_level: '4th Year',
    gpa: 3.68,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0024',
    first_name: 'Chloe',
    last_name: 'King',
    email: 'chloe.king@university.edu',
    phone: '+1 (555) 567-8914',
    gender: 'Female',
    dob: '2005-08-01',
    department: 'Business Administration',
    year_level: '1st Year',
    gpa: 3.45,
    status: 'Active',
  },
  {
    student_id: 'STU-2024-0025',
    first_name: 'Gabriel',
    last_name: 'Wright',
    email: 'gabriel.wright@university.edu',
    phone: '+1 (555) 678-9025',
    gender: 'Male',
    dob: '2004-06-12',
    department: 'Computer Science',
    year_level: '2nd Year',
    gpa: 3.91,
    status: 'Active',
  },
];

function seedDatabase() {
  const insert = db.prepare(`
    INSERT INTO students (
      student_id, first_name, last_name, email, phone,
      gender, dob, department, year_level, gpa, status
    ) VALUES (
      @student_id, @first_name, @last_name, @email, @phone,
      @gender, @dob, @department, @year_level, @gpa, @status
    )
  `);

  const insertMany = db.transaction((students) => {
    for (const student of students) {
      insert.run(student);
    }
  });

  insertMany(SAMPLE_STUDENTS);
}

function resetDatabase() {
  const reset = db.transaction(() => {
    db.prepare('DELETE FROM students').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'students'").run();
    seedDatabase();
  });
  reset();
}

// Auto-seed if empty
const count = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
if (count === 0) {
  seedDatabase();
}

module.exports = {
  db,
  seedDatabase,
  resetDatabase,
  SAMPLE_STUDENTS,
};
