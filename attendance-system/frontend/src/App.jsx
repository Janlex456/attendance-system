import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
// TimePicker imports commented out - missing @mui/x-date-pickers dependency
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { Container, Typography, Button, Box, TextField, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import LoginForm from './components/LoginForm.jsx';
import QRScanner from './components/QRScanner.jsx';
import QRCodeGenerator from './components/QRCodeGenerator.jsx';

function TeacherProfile() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.get('/auth/teachers/me')
      setProfile(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load teacher profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match')
      return
    }

    try {
      setLoading(true)
      await api.put('/auth/teachers/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      setSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ pt: 6, pb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Teacher Profile
      </Typography>

      {loading && <Alert severity="info" sx={{ mb: 2 }}>Loading...</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {profile && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Account Info
          </Typography>
          <Typography variant="body2">Name: <strong>{profile.full_name || '-'}</strong></Typography>
          <Typography variant="body2">Email: <strong>{profile.email || '-'}</strong></Typography>
          <Typography variant="body2">Teacher ID: <strong>{profile.student_id || profile.id}</strong></Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Change Password
        </Typography>
        <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <TextField
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </Box>
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Button component={Link} to="/" variant="outlined" color="inherit">
          Back to Dashboard
        </Button>
      </Box>
    </Container>
  )
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7cb342' },
    secondary: { main: '#aed581' },
    background: {
      default: '#0f3d12',
      paper: '#183f16',
    },
    text: {
      primary: '#e8f5e9',
      secondary: '#c8e6c9',
    },
  },
});

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  // used for forcing profile dialog to refresh based on scanner results
  const [lastScannedStudentId, setLastScannedStudentId] = useState(null);

  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser({});
  };

  const ProtectedRoute = ({ children, roles }) => {
    if (!token) return <Navigate to="/login" />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/login" />;
    return children;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginForm login={login} />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard user={user} logout={logout} />
            </ProtectedRoute>
          } />
          <Route path="/teacher/classes" element={
            <ProtectedRoute roles={['teacher']}>
              <TeacherClasses />
            </ProtectedRoute>
          } />
          <Route path="/teacher/profile" element={
            <ProtectedRoute roles={['teacher']}>
              <TeacherProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/subjects" element={
            <ProtectedRoute roles={['admin']}>
              <AdminSubjects />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={['admin']}>
              <AdminReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/create-teacher" element={
            <ProtectedRoute roles={['admin']}>
              <CreateTeacher />
            </ProtectedRoute>
          } />
          <Route path="/admin/teachers" element={
            <ProtectedRoute roles={['admin']}>
              <AdminTeachers />
            </ProtectedRoute>
          } />
          <Route path="/admin/students" element={
            <ProtectedRoute roles={['admin']}>
              <AdminStudents lastScannedStudentId={lastScannedStudentId} />
            </ProtectedRoute>
          } />
          <Route path="/scanner" element={
            <ProtectedRoute roles={['student', 'teacher', 'admin']}>
              <QRScanner onScanStudentId={(id) => setLastScannedStudentId(id)} />
            </ProtectedRoute>
          } />
          <Route path="/qr-generator" element={
            <ProtectedRoute roles={['teacher', 'admin']}>
              <QRCodeGenerator />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

function Dashboard({ user, logout }) {
  return (
    <Container maxWidth="md" sx={{ pt: 6 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {user.full_name || 'Teacher'}
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Role: {user.role}
      </Typography>
      

      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {user.role === 'teacher' && (
          <>
            <Button component={Link} to="/teacher/classes" variant="contained">
              View Classes
            </Button>
            <Button component={Link} to="/teacher/profile" variant="outlined" color="inherit">
              Profile
            </Button>
            <Button component={Link} to="/scanner" variant="outlined">
              Open Scan Station
            </Button>
          </>
        )}
        {user.role === 'admin' && (
          <>
            <Button component={Link} to="/admin/subjects" variant="contained">
              Manage Subjects
            </Button>
            <Button component={Link} to="/admin/reports" variant="contained">
              View Reports
            </Button>
            <Button component={Link} to="/admin/teachers" variant="contained">
              Manage Teachers
            </Button>
            <Button component={Link} to="/admin/students" variant="contained">
              Manage Students
            </Button>
            <Button component={Link} to="/scanner" variant="outlined">
              Open QR Scanner
            </Button>
          </>
        )}
        {user.role === 'student' && (
          <>
            <Button component={Link} to="/scanner" variant="contained">
              Scan QR Code
            </Button>
          </>
        )}
        <Button color="error" variant="outlined" onClick={logout}>
          Logout
        </Button>
      </Box>
    </Container>
  );
}

function TeacherClasses() {
  const [subjects, setSubjects] = useState([]);
  const [gradeLevel, setGradeLevel] = useState('');
  const [gradeLevels, setGradeLevels] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    loadSubjects();
    loadGradeLevels();
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await api.get('/subjects/my');
      setSubjects(res.data);
    } catch (err) {
      setError('Failed to load subjects');
    }
  };

  const loadGradeLevels = async () => {
    try {
      const res = await api.get('/subjects/teacher/grade-levels');
      setGradeLevels(res.data);
    } catch (err) {
      console.error('Failed to load year levels');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subjectId', selectedSubject);
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);

      const res = await api.get(`/reports/filtered/search?${params}`);
      setRecords(res.data);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subjectId', selectedSubject);
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);
      params.append('format', 'csv');

      window.location.href = `http://localhost:5000/api/reports/filtered/search?${params}`;
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const worksheetData = records.map(record => ({
        Date: record.session_date ? new Date(record.session_date).toLocaleDateString() : '-',
        Subject: record.subject || '-',
        'Student ID': record.student_id || '-',
        'Student Name': record.full_name || '-',
        Grade: record.grade_level || '-',
        'Time In': record.start_scan_time ? new Date(record.start_scan_time).toLocaleTimeString() : '-',
        'Time Out': record.end_scan_time ? new Date(record.end_scan_time).toLocaleTimeString() : '-',
        Status: record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      
      const headerRow = Object.keys(worksheetData[0] || {});
      headerRow.forEach((_, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
        if (ws[cellRef]) {
          ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: '7CB342' } } };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
      XLSX.writeFile(wb, `class_attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      setError('Failed to export Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Class Attendance Report', 14, 20);
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      const tableData = records.map(record => [
        record.session_date ? new Date(record.session_date).toLocaleDateString() : '-',
        record.subject || '-',
        record.student_id || '-',
        record.full_name || '-',
        record.grade_level || '-',
        record.start_scan_time ? new Date(record.start_scan_time).toLocaleTimeString() : '-',
        record.end_scan_time ? new Date(record.end_scan_time).toLocaleTimeString() : '-',
        record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'
      ]);

      doc.autoTable({
        head: [['Date', 'Subject', 'Student ID', 'Student Name', 'Grade', 'Time In', 'Time Out', 'Status']],
        body: tableData,
        startY: 40,
        headStyles: { fillColor: [124, 179, 66] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 35 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 18 }
        }
      });

      doc.save(`class_attendance_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      setError('Failed to export PDF');
    }
  };

  const handleReset = () => {
    setSelectedSubject('');
    setGradeLevel('');
    setStartDate('');
    setEndDate('');
    setStatus('');
    setRecords([]);
    setSearched(false);
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Class Attendance Records
        </Typography>
        <Button component={Link} to="/" variant="outlined" color="inherit">
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filters</Typography>
        <Box component="form" onSubmit={handleSearch} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
          
          {/* Subject Filter */}
          <TextField
            select
            label="Subject/Course"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Subjects</MenuItem>
            {subjects.map(subject => (
              <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
            ))}
          </TextField>

          {/* Year Level Filter */}
          <TextField
            select
            label="Year Level"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Grades</MenuItem>
            {gradeLevels.map(grade => (
              <MenuItem key={grade} value={grade}>{grade}</MenuItem>
            ))}
          </TextField>

          {/* Status Filter */}
          <TextField
            select
            label="Attendance Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="present">Present</MenuItem>
            <MenuItem value="late">Late</MenuItem>
            <MenuItem value="absent">Absent</MenuItem>
          </TextField>

          {/* Start Date Filter */}
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* End Date Filter */}
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>

        {/* Action Buttons */}
<Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Reset Filters
          </Button>
          {searched && records.length > 0 && (
            <>
              <Button
                variant="outlined"
                onClick={handlePrint}
                sx={{ '@media print': { display: 'none' } }}
              >
                Print
              </Button>
              <Button
                variant="outlined"
                onClick={handleExportCSV}
                startIcon={<DownloadIcon />}
                sx={{ '@media print': { display: 'none' } }}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                onClick={handleExportExcel}
                startIcon={<TableChartIcon />}
                sx={{ '@media print': { display: 'none' } }}
              >
                Export Excel
              </Button>
              <Button
                variant="outlined"
                onClick={handleExportPDF}
                startIcon={<PictureAsPdfIcon />}
                sx={{ '@media print': { display: 'none' } }}
              >
                Export PDF
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Results Summary */}
      {searched && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            Found {records.length} attendance record{records.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {/* Results Table */}
      {searched && records.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#7cb342' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Student ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Time In</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Time Out</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record, idx) => (
                <TableRow key={idx}>
                  <TableCell>{new Date(record.session_date).toLocaleDateString()}</TableCell>

                  <TableCell>{record.subject}</TableCell>
                  <TableCell>{record.student_id}</TableCell>
                  <TableCell>{record.full_name}</TableCell>
                  <TableCell>{record.grade_level}</TableCell>
                  <TableCell>{record.start_scan_time ? new Date(record.start_scan_time).toLocaleTimeString() : '-'}</TableCell>
                  <TableCell>
                    {record.end_scan_time ? new Date(record.end_scan_time).toLocaleTimeString() : '-'}
                    {record.timeout_reason === 'time_out_missing' && (
                      <Typography variant="caption" display="block" sx={{ color: '#ffcdd2', mt: 0.5 }}>
                        Hindi nakapag time out
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 2,
                        py: 1,
                        borderRadius: '4px',
                        backgroundColor: record.status === 'present' ? '#c8e6c9' : record.status === 'late' ? '#ffe0b2' : '#ffcdd2',
                        color: record.status === 'present' ? '#1b5e20' : record.status === 'late' ? '#e65100' : '#b71c1c',
                        fontSize: '0.875rem'
                      }}
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* No Results Message */}
      {searched && records.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No attendance records found matching your filters.
          </Typography>
        </Paper>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none; }
        }
      `}</style>
    </Container>
  );
}

function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', class_start_time: null, class_end_time: null });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load subjects');
    }
  };

  const loadTeachers = async () => {
    try {
      const res = await api.get('/auth/teachers');
      setTeachers(res.data);
    } catch (err) {
      console.error('Could not load teachers');
    }
  };

  useEffect(() => {
    loadSubjects();
    loadTeachers();
  }, []);

  const handleEdit = (subject) => {
    setEditingId(subject.id);
    setForm({ 
      name: subject.name, 
      class_start_time: subject.class_start_time || null, 
      class_end_time: subject.class_end_time || null 
    });
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ name: '' });
  };

  const handleSave = async () => {
    try {
      await api.put(`/subjects/${editingId}`, {
        name: form.name,
        class_start_time: form.class_start_time || null,
        class_end_time: form.class_end_time || null
      });
      setMessage('Subject updated successfully');
      setEditingId(null);
      setForm({ name: '', class_start_time: null, class_end_time: null });
      loadSubjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update subject');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject? Attendance data may be affected.')) return;
    try {
      await api.delete(`/subjects/${id}`);
      setMessage('Subject deleted');
      if (editingId === id) handleCancel();
      loadSubjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete subject');
    }
  };

  const [showNewSubject, setShowNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [newSubjectStartTime, setNewSubjectStartTime] = useState('');
  const [newSubjectEndTime, setNewSubjectEndTime] = useState('');

  const handleAddSubject = async () => {
    try {
      await api.post('/subjects', { 
        name: newSubjectName, 
        teacher_id: newSubjectTeacher,
        class_start_time: newSubjectStartTime || null,
        class_end_time: newSubjectEndTime || null
      });
      setMessage('Subject created successfully');
      setNewSubjectName('');
      setNewSubjectTeacher('');
      setNewSubjectStartTime('');
      setNewSubjectEndTime('');
      setShowNewSubject(false);
      loadSubjects();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create subject');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 6 }}>
      <Typography variant="h4" gutterBottom>
        Manage Subjects
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Admins can add, edit or remove subjects here.
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Add New Subject */}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Button onClick={() => setShowNewSubject(!showNewSubject)} variant="contained" sx={{ mb: 2 }}>
          {showNewSubject ? 'Back' : 'Add New Subject'}
        </Button>
        {showNewSubject && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, alignItems: 'end' }}>
            <TextField
              label="Subject Name"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              required
            />
            
            

            <TextField
              select
              label="Assign Teacher"
              value={newSubjectTeacher}
              onChange={(e) => setNewSubjectTeacher(e.target.value)}
              required
            >
              <MenuItem value="">Select Teacher</MenuItem>
              {teachers.map(teacher => (
                <MenuItem key={teacher.id} value={teacher.id}>{teacher.full_name}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Class Start Time"
              type="time"
              value={newSubjectStartTime}
              onChange={(e) => setNewSubjectStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Class End Time"
              type="time"
              value={newSubjectEndTime}
              onChange={(e) => setNewSubjectEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button 
              variant="contained" 
              onClick={handleAddSubject} 
              disabled={!newSubjectName.trim() || !newSubjectTeacher}
              sx={{ gridColumn: '1 / -1' }}
            >
              Add Subject
            </Button>
          </Box>
        )}
      </Paper>

      <TableContainer component="Paper" sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#7cb342' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subject Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Start Time</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>End Time</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Assigned Teacher</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subjects.map((subject) => {
              const teacher = teachers.find(t => t.id === subject.teacher_id);
              return (
                <TableRow key={subject.id}>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.class_start_time || '-'}</TableCell>
                  <TableCell>{subject.class_end_time || '-'}</TableCell>
                  <TableCell>{teacher?.full_name || 'Unknown'}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(subject)} size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(subject.id)} size="small" color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Subject Edit Panel */}
      {editingId && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Edit Subject
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, maxWidth: 520 }}>
            <TextField
              label="Subject Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Class Start Time"
              type="time"
              value={form.class_start_time || ''}
              onChange={(e) => setForm({ ...form, class_start_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Class End Time"
              type="time"
              value={form.class_end_time || ''}
              onChange={(e) => setForm({ ...form, class_end_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                Save
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancel}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
}


function AdminReports() {
  const [subjects, setSubjects] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    loadSubjects();
    // This app's backend currently doesn't expose a global grade-level list.
    // Keeping the UI usable: free-form gradeLevel filter will still work.
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch {
      // not fatal; filters can still work if subject selector is empty
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subjectId', selectedSubject);
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);

      const res = await api.get(`/reports/filtered/search?${params.toString()}`);
      setRecords(res.data);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subjectId', selectedSubject);
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (status) params.append('status', status);
      params.append('format', 'csv');

      window.location.href = `http://localhost:5000/api/reports/filtered/search?${params.toString()}`;
    } catch {
      setError('Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      // Use client-side export with xlsx library
      const worksheetData = records.map(record => ({
        Date: record.session_date ? new Date(record.session_date).toLocaleDateString() : '-',
        Subject: record.subject || '-',
        'Student ID': record.student_id || '-',
        'Student Name': record.full_name || '-',
        Grade: record.grade_level || '-',
        'Time In': record.start_scan_time ? new Date(record.start_scan_time).toLocaleTimeString() : '-',
        'Time Out': record.end_scan_time ? new Date(record.end_scan_time).toLocaleTimeString() : '-',
        Status: record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      
      // Style header row
      const headerRow = Object.keys(worksheetData[0] || {});
      headerRow.forEach((_, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
        if (ws[cellRef]) {
          ws[cellRef].s = { font: { bold: true }, fill: { fgColor: { rgb: '7CB342' } } };
        }
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
      XLSX.writeFile(wb, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      setError('Failed to export Excel');
    }
  };

  const handleExportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Attendance Report', 14, 20);
      
      // Date generated
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Prepare table data
      const tableData = records.map(record => [
        record.session_date ? new Date(record.session_date).toLocaleDateString() : '-',
        record.subject || '-',
        record.student_id || '-',
        record.full_name || '-',
        record.grade_level || '-',
        record.start_scan_time ? new Date(record.start_scan_time).toLocaleTimeString() : '-',
        record.end_scan_time ? new Date(record.end_scan_time).toLocaleTimeString() : '-',
        record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : '-'
      ]);

      doc.autoTable({
        head: [['Date', 'Subject', 'Student ID', 'Student Name', 'Grade', 'Time In', 'Time Out', 'Status']],
        body: tableData,
        startY: 40,
        headStyles: { fillColor: [124, 179, 66] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 35 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 18 }
        }
      });

      doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      setError('Failed to export PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setSelectedSubject('');
    setGradeLevel('');
    setStartDate('');
    setEndDate('');
    setStatus('');
    setRecords([]);
    setSearched(false);
    setError('');
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Admin Attendance Reports</Typography>
        <Button component={Link} to="/" variant="outlined" color="inherit">
          Back to Dashboard
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filters</Typography>

        <Box component="form" onSubmit={handleSearch} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2, mb: 2 }}>
          <TextField
            select
            label="Subject/Course"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Subjects</MenuItem>
            {subjects.map((subject) => (
              <MenuItem key={subject.id} value={subject.id}>{subject.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Year Level"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="e.g., 10"
            fullWidth
          />

          <TextField
            select
            label="Attendance Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            fullWidth
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="present">Present</MenuItem>
            <MenuItem value="late">Late</MenuItem>
            <MenuItem value="absent">Absent</MenuItem>
          </TextField>

          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          {/* spacer to keep grid consistent */}
          <Box />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Reset Filters
          </Button>
          {searched && records.length > 0 && (
            <>
              <Button
                variant="outlined"
                onClick={handlePrint}
                sx={{ '@media print': { display: 'none' } }}
              >
                Print
              </Button>
<Button
                variant="outlined"
                onClick={handleExportCSV}
                startIcon={<DownloadIcon />}
                sx={{ '@media print': { display: 'none' } }}
              >
                Export to CSV
              </Button>
              <Button
                variant="outlined"
                onClick={handleExportExcel}
                startIcon={<TableChartIcon />}
                sx={{ '@media print': { display: 'none' } }}
              >
                Export to Excel
              </Button>
              <Button
                variant="outlined"
                onClick={handleExportPDF}
                startIcon={<PictureAsPdfIcon />}
                sx={{ '@media print': { display: 'none' } }}
              >
                Export to PDF
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {searched && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="text.secondary">
            Found {records.length} attendance record{records.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {searched && records.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#7cb342' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Student ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Student Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Grade</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Scan Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record, idx) => (
                <TableRow key={idx}>

                  <TableCell>{new Date(record.session_date).toLocaleDateString()}</TableCell>
                  <TableCell>{record.subject}</TableCell>
                  <TableCell>{record.student_id}</TableCell>
                  <TableCell>{record.full_name}</TableCell>
                  <TableCell>{record.grade_level}</TableCell>
                  <TableCell>{record.scan_time ? new Date(record.scan_time).toLocaleTimeString() : '-'}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-block',
                        px: 2,
                        py: 1,
                        borderRadius: '4px',
                        backgroundColor: record.status === 'present' ? '#c8e6c9' : record.status === 'late' ? '#ffe0b2' : '#ffcdd2',
                        color: record.status === 'present' ? '#1b5e20' : record.status === 'late' ? '#e65100' : '#b71c1c',
                        fontSize: '0.875rem'
                      }}
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {searched && records.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
          <Typography color="text.secondary">
            No attendance records found matching your filters.
          </Typography>
        </Paper>
      )}

      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none; }
        }
      `}</style>
    </Container>
  );
}


function AdminTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({ email: '', full_name: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [teacherGradeLevels, setTeacherGradeLevels] = useState([]);
  const [newGradeLevel, setNewGradeLevel] = useState('');

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadTeachers = async () => {
    try {
      const res = await api.get('/auth/teachers');
      setTeachers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load teachers');
    }
  };

  const loadTeacherGradeLevels = async (teacherId) => {
    try {
      const res = await api.get(`/subjects/admin/grade-levels/${teacherId}`);
      setTeacherGradeLevels(res.data);
    } catch (err) {
      console.error('Could not load year levels');
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleEdit = (teacher) => {
    setEditingId(teacher.id);
    setForm({ email: teacher.email, full_name: teacher.full_name, password: '' });
    setMessage('');
    setError('');
    loadTeacherGradeLevels(teacher.id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ email: '', full_name: '', password: '' });
    setTeacherGradeLevels([]);
    setNewGradeLevel('');
  };

  const handleSave = async () => {
    try {
      await api.put(`/auth/teachers/${editingId}`, {
        email: form.email,
        full_name: form.full_name,
        password: form.password || undefined
      });
      setMessage('Teacher updated successfully');
      setEditingId(null);
      setForm({ email: '', full_name: '', password: '' });
      setTeacherGradeLevels([]);
      setNewGradeLevel('');
      loadTeachers();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update teacher');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher account?')) return;
    try {
      await api.delete(`/auth/teachers/${id}`);
      setMessage('Teacher deleted');
      if (editingId === id) handleCancel();
      loadTeachers();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete teacher');
    }
  };

  const handleAddGradeLevel = async () => {
    try {
      await api.post(`/subjects/admin/grade-levels/${editingId}`, { grade_level: newGradeLevel });
      setNewGradeLevel('');
      loadTeacherGradeLevels(editingId);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add year level');
    }
  };

  const handleRemoveGradeLevel = async (gradeLevel) => {
    try {
      await api.delete(`/subjects/admin/grade-levels/${editingId}/${gradeLevel}`);
      loadTeacherGradeLevels(editingId);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove year level');
    }
  };

  const [showNewTeacher, setShowNewTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ email: '', full_name: '', password: '' });
  const [newTeacherGradeLevels, setNewTeacherGradeLevels] = useState([]);
  const [newTeacherGradeLevelInput, setNewTeacherGradeLevelInput] = useState('');

  const handleAddTeacher = async () => {
    try {
      const res = await api.post('/auth/register', {
        email: newTeacher.email,
        password: newTeacher.password,
        role: 'teacher',
        full_name: newTeacher.full_name
      });

      const createdTeacherId = res.data.user.id;

      // Assign year levels for the new teacher
      for (const grade of newTeacherGradeLevels) {
        try {
          await api.post(`/subjects/admin/grade-levels/${createdTeacherId}`, { grade_level: grade });
        } catch (gradeErr) {
          console.error(`Failed to assign year level ${grade}:`, gradeErr);
        }
      }

      setMessage('Teacher created successfully');
      setNewTeacher({ email: '', full_name: '', password: '' });
      setNewTeacherGradeLevels([]);
      setNewTeacherGradeLevelInput('');
      setShowNewTeacher(false);
      loadTeachers();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create teacher');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 6 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Manage Teachers
       
        </Typography>
        {/*<Button component={Link} to="/" variant="outlined" color="inherit">
          Back to Dashboard
        </Button>*/}
      </Box>
      <Typography color="text.secondary" gutterBottom>
        Admins can add, edit or remove teacher accounts here.
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Add New Teacher */}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Button onClick={() => setShowNewTeacher(!showNewTeacher)} variant="contained" sx={{ mb: 2 }}>
          {showNewTeacher ? 'Back' : 'Add New Teacher'}
        </Button>
        {showNewTeacher && (
          <Box sx={{ display: 'grid', gap: 2, maxWidth: 480 }}>
            <TextField
              label="Full Name"
              value={newTeacher.full_name}
              onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
              required
            />
            <TextField
              label="Email"
              value={newTeacher.email}
              onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
              required
              type="email"
            />
            <TextField
              label="Password"
              value={newTeacher.password}
              onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
              required
              type="password"
            />

            {/* Year Level Assignment during creation */}
            <Box sx={{ pt: 1, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <Typography variant="subtitle2" gutterBottom>Assigned Year Levels</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'end', mb: 2 }}>
                <TextField
                  label="Add Year Level"
                  value={newTeacherGradeLevelInput}
                  onChange={(e) => setNewTeacherGradeLevelInput(e.target.value)}
                  placeholder="e.g., Year 10"
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    const val = newTeacherGradeLevelInput.trim();
                    if (val && !newTeacherGradeLevels.includes(val)) {
                      setNewTeacherGradeLevels([...newTeacherGradeLevels, val]);
                      setNewTeacherGradeLevelInput('');
                    }
                  }}
                  disabled={!newTeacherGradeLevelInput.trim()}
                >
                  Add
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {newTeacherGradeLevels.length === 0 && (
                  <Typography variant="body2" color="text.secondary">No year levels assigned</Typography>
                )}
                {newTeacherGradeLevels.map((grade) => (
                  <Box
                    key={grade}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 0.5,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(124, 179, 66, 0.2)',
                      border: '1px solid rgba(124, 179, 66, 0.5)'
                    }}
                  >
                    <Typography variant="body2">{grade}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setNewTeacherGradeLevels(newTeacherGradeLevels.filter(g => g !== grade))}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>

            <Button variant="contained" onClick={handleAddTeacher} disabled={!newTeacher.email || !newTeacher.full_name || !newTeacher.password}>
              Add Teacher
            </Button>
          </Box>
        )}
      </Paper>

      <Box sx={{ mb: 1, mt: 2 }}>
        <TextField
          label="Search Teacher (ID/Email)"
          value={teacherSearch}
          onChange={(e) => setTeacherSearch(e.target.value)}
          fullWidth
        />
      </Box>

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>

          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Teacher ID</TableCell>

              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teachers
              .filter((t) => {
                const q = (teacherSearch || '').trim().toLowerCase();
                if (!q) return true;
                const id = (t.id || '').toString().toLowerCase();
                const emailValue = (t.email || '').toString().toLowerCase();
                return id.includes(q) || emailValue.includes(q);
              })
              .map((teacher) => (
                <TableRow key={teacher.id}>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>{teacher.full_name}</TableCell>
                <TableCell>{teacher.id}</TableCell>

                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(teacher)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(teacher.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editingId && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Edit Teacher</Typography>
          <Box sx={{ display: 'grid', gap: 2, maxWidth: 480 }}>
            <TextField
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              required
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              type="email"
            />
            <TextField
              label="New Password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              type="password"
              helperText="Leave blank to keep current password"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                Save
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancel}>
                Cancel
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <Typography variant="subtitle1" gutterBottom>Assigned Year Levels</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'end', mb: 2 }}>
              <TextField
                label="Add Year Level"
                value={newGradeLevel}
                onChange={(e) => setNewGradeLevel(e.target.value)}
                placeholder="e.g., Grade 10"
                size="small"
              />
              <Button variant="contained" size="small" onClick={handleAddGradeLevel} disabled={!newGradeLevel.trim()}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {teacherGradeLevels.length === 0 && (
                <Typography variant="body2" color="text.secondary">No year levels assigned</Typography>
              )}
              {teacherGradeLevels.map((grade) => (
                <Box
                  key={grade}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 0.5,
                    borderRadius: '16px',
                    backgroundColor: 'rgba(124, 179, 66, 0.2)',
                    border: '1px solid rgba(124, 179, 66, 0.5)'
                  }}
                >
                  <Typography variant="body2">{grade}</Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveGradeLevel(grade)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </Paper>
      )}
      <Button component={Link} to="/" variant="outlined" color="inherit">
        Back to Dashboard
      </Button>
    </Container>
  );
}

function CreateTeacher() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      const res = await api.post('/auth/register', {
        email,
        password,
        role: 'teacher',
        full_name: fullName
      });
      setMessage(`Teacher account created: ${res.data.user.email}`);
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create teacher');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ pt: 6 }}>
      <Typography variant="h4" gutterBottom>
        Create Teacher Account
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Admins can create teacher accounts here with their own login credentials.
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={handleCreate} sx={{ display: 'grid', gap: 2 }}>
        <TextField
          label="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
        />

        {/* Password field removed as per request */}

        <Button type="submit" variant="contained">
          Create Teacher
        </Button>
        <Button component={Link} to="/" variant="outlined" color="inherit">
          Back to Dashboard
        </Button>
      </Box>
    </Container>
  );
}

function AdminStudents({ lastScannedStudentId }) {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ email: '', full_name: '', student_id: '', grade_level: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);


  // Registration form state
  const [showRegister, setShowRegister] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [subjectIds, setSubjectIds] = useState([]);
  const [gradeLevel, setGradeLevel] = useState('');
  const [studentId, setStudentId] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');

  // Keep email input visible, but bind it to studentEmail state.
  const [email, setEmail] = useState('');





  // QR display state
  const [qrImage, setQrImage] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [registeredStudent, setRegisteredStudent] = useState(null);

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const loadStudents = async () => {
    try {
      const res = await api.get('/auth/students');
      setStudents(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load students');
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch (err) {
      console.error('Could not load subjects');
    }
  };

  useEffect(() => {
    loadStudents();
    loadSubjects();
  }, []);

  const handleEdit = (student) => {
    setEditingId(student.id);
    setForm({
      email: student.email,
      full_name: student.full_name,
      student_id: student.student_id || '',
      grade_level: student.grade_level || '',
      password: ''
    });
    setMessage('');
    setError('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ email: '', full_name: '', student_id: '', grade_level: '', password: '' });
  };

  const handleSave = async () => {
    try {
      await api.put(`/auth/students/${editingId}`, {
        email: form.email,
        full_name: form.full_name,
        student_id: form.student_id || undefined,
        grade_level: form.grade_level || undefined,
        password: form.password || undefined
      });
      setMessage('Student updated successfully');
      setEditingId(null);
      setForm({ email: '', full_name: '', student_id: '', grade_level: '', password: '' });
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update student');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student account?')) return;
    try {
      await api.delete(`/auth/students/${id}`);
      setMessage('Student deleted');
      if (editingId === id) handleCancel();
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete student');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    setQrImage(null);
    setQrData(null);
    setRegisteredStudent(null);

    if (!firstName || !lastName || subjectIds.length === 0 || !gradeLevel || !studentId) {
      setError('Please fill in all required fields');
      return;
    }


    setRegisterLoading(true);
    try {
      const res = await api.post('/auth/register-student-multi-subject', {
        first_name: firstName,
        last_name: lastName,
        subject_ids: subjectIds,
        grade_level: gradeLevel,
        student_id: studentId,
        email: email
      });

      setMessage(res.data.message);
      setRegisteredStudent(res.data.student);
      setQrImage(res.data.qrImage);
      setQrData(res.data.qrData);

      // Reset form
      setFirstName('');
      setLastName('');
      setSubjectIds([]);
      setGradeLevel('');
      setStudentId('');
      setEmail('');

      // IMPORTANT: force re-fetch students table after successful register.
      await loadStudents();

    } catch (err) {
      const apiErr = err.response?.data;
      const message =
        apiErr?.error ||
        (typeof apiErr === 'string' ? apiErr : null) ||
        'Could not register student';
      const debug = apiErr && typeof apiErr === 'object' ? JSON.stringify(apiErr, null, 2) : '';
      setError(debug ? `${message}\n\n${debug}` : message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleViewProfile = async (student) => {
    try {
      setProfileOpen(true);
      setProfileLoading(true);
      setProfileError('');
      setSelectedStudentProfile(null);

      const res = await api.get(`/auth/students/${student.id}/profile`);
      setSelectedStudentProfile(res.data);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Could not load student profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setProfileOpen(false);
    setSelectedStudentProfile(null);
    setProfileError('');
  };

  const filteredStudents = students.filter((s) => {
    const q = (studentSearch || '').trim().toLowerCase();
    if (!q) return true;

    const id = (s.student_id || '').toString().toLowerCase();
    const emailValue = (s.email || '').toString().toLowerCase();

    // requirement: allow exact student via student_id and email
    return id.includes(q) || emailValue.includes(q);
  });

  // If admin is currently viewing a student profile and a scan happens for the same student,
  // re-fetch the profile so enrolled subjects are up-to-date.
  useEffect(() => {

    const scannedId = lastScannedStudentId;
    if (!profileOpen || !scannedId) return;

    const currentId = selectedStudentProfile?.student?.id;
    if (!currentId) return;
    if (Number(currentId) !== Number(scannedId)) return;

    const refresh = async () => {
      try {
        setProfileLoading(true);
        setProfileError('');
        const res = await api.get(`/auth/students/${scannedId}/profile`);
        setSelectedStudentProfile(res.data);
      } catch (err) {
        setProfileError(err.response?.data?.error || 'Could not refresh student profile');
      } finally {
        setProfileLoading(false);
      }
    };

    refresh();
  }, [lastScannedStudentId, profileOpen, selectedStudentProfile, api]);

  const downloadQR = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.href = qrImage;
    link.download = `QR_${registeredStudent?.full_name || 'student'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = () => {
    if (!qrImage) return;
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${registeredStudent?.full_name || 'Student'}</title>
          <style>
            body { text-align: center; font-family: Arial; padding: 20px; }
            img { max-width: 400px; margin: 20px 0; }
            h2 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h2>${registeredStudent?.full_name || 'Student'}</h2>
          <p>Student ID: ${registeredStudent?.student_id || '-'}</p>
          <p>Year Level: ${registeredStudent?.grade_level || '-'}</p>
          <img src="${qrImage}" />
          <p style="font-size: 12px; margin-top: 30px;">Generated on ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Container maxWidth="lg" sx={{ pt: 6 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Manage Students
        </Typography>
       {/*} <Button component={Link} to="/" variant="outlined" color="inherit">
          Back to Dashboard
        </Button>*/}
      </Box>
      <Typography color="text.secondary" gutterBottom>
        Register new students and generate their QR codes, or manage existing students.
      </Typography>
      {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Register New Student Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Button onClick={() => setShowRegister(!showRegister)} variant="contained" sx={{ mb: 2 }}>
          {showRegister ? 'Back' : 'Register New Student'}
        </Button>
        {showRegister && (
          <Box component="form" onSubmit={handleRegister} sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1 }}>
                  <TextField
                    select
                    label="Add subject"
                    value={''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      if (!id) return;
                      setSubjectIds((prev) => {
                        if (prev.includes(id)) return prev;
                        return [...prev, id];
                      });
                    }}
                    helperText="Select a subject to add"
                  >

                  <MenuItem value="">-- Select Subject --</MenuItem>
                  {subjects.map((subject) => (
                    <MenuItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
                  {subjectIds.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No subjects selected
                    </Typography>
                  ) : (
                    subjectIds
                      .map((id) => subjects.find((s) => s.id === id))
                      .filter(Boolean)
                      .map((s) => (
                        <Chip
                          key={s.id}
                          label={s.name}
                          onDelete={() => {
                            setSubjectIds((prev) => prev.filter((x) => x !== s.id));
                          }}
                          sx={{ borderColor: 'rgba(124, 179, 66, 0.6)' }}
                        />
                      ))
                  )}
                </Box>
              </Box>



              <TextField
                label="Year Level"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                placeholder="e.g., Year 10"
                required
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button type="submit" variant="contained" disabled={registerLoading}>
                {registerLoading ? 'Registering...' : 'Register (ONE QR)'}
              </Button>

            </Box>
          </Box>
        )}

        {/* QR Code Display */}
        {qrImage && (
          <Paper sx={{ mt: 3, p: 3, bgcolor: '#1b5e20', color: '#e8f5e9', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              QR Code Generated
            </Typography>
            <img src={qrImage} alt="QR Code" style={{ maxWidth: '300px', margin: '20px 0' }} />
            <Typography variant="body2" sx={{ my: 1 }}>
              Name: <strong>{registeredStudent?.full_name}</strong>
            </Typography>
            <Typography variant="body2">
              Student ID: <strong>{registeredStudent?.student_id}</strong>
            </Typography>
            <Typography variant="body2">
              Year Level: <strong>{registeredStudent?.grade_level}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 2, fontSize: '12px', fontStyle: 'italic' }}>
              QR Data: {qrData}
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadQR}>
                Download
              </Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={printQR}>
                Print
              </Button>
            </Box>
          </Paper>
        )}
      </Paper>

      {/* Students Table */}
      <Box sx={{ mb: 1, mt: 2 }}>
        <TextField
          label="Search Student (ID/Email)"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          fullWidth
        />
      </Box>

      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#7cb342' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Full Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Student ID</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Year Level</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.map((student) => (
              <TableRow key={student.id} hover>
                <TableCell>{student.full_name}</TableCell>
                <TableCell>{student.email || '-'}</TableCell>
                <TableCell>{student.student_id || '-'}</TableCell>
                <TableCell>{student.grade_level || '-'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton onClick={() => handleViewProfile(student)} size="small" color="inherit" title="View profile">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEdit(student)} size="small" color="primary" title="Edit">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(student.id)} size="small" color="error" title="Delete">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

        </Table>
      </TableContainer>



      {/* Student Edit Panel */}
      {editingId && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Edit Student
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, maxWidth: 520 }}>
            <TextField
              label="Email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <TextField
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              required
            />
            <TextField
              label="Student ID"
              value={form.student_id}
              onChange={(e) => setForm((prev) => ({ ...prev, student_id: e.target.value }))}
              helperText="Leave blank if your backend uses student_id as optional"
            />
            <TextField
              label="Year Level"
              value={form.grade_level}
              onChange={(e) => setForm((prev) => ({ ...prev, grade_level: e.target.value }))}
            />
            <TextField
              label="New Password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              type="password"
              helperText="Leave blank to keep current password"
            />

            <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                Save
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<CancelIcon />} onClick={handleCancel}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      )}


      {/* Student profile dialog (Admin) */}
      <Dialog open={profileOpen} onClose={handleCloseProfile} maxWidth="sm" fullWidth>
        <DialogTitle>Student Profile</DialogTitle>
        <DialogContent>
          {profileLoading && <Alert severity="info">Loading profile...</Alert>}
          {profileError && <Alert severity="error">{profileError}</Alert>}

          {!profileLoading && selectedStudentProfile && (
            <Box sx={{ display: 'grid', gap: 1, py: 1 }}>
              <Typography variant="subtitle1">
                <strong>{selectedStudentProfile.student.full_name}</strong>
              </Typography>
              <Typography variant="body2">Email: {selectedStudentProfile.student.email}</Typography>
              <Typography variant="body2">Student ID: {selectedStudentProfile.student.student_id}</Typography>
              <Typography variant="body2">Year Level: {selectedStudentProfile.student.grade_level || '-'}</Typography>

              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Enrolled Subjects ({selectedStudentProfile.enrolledSubjects.length})
              </Typography>

              {selectedStudentProfile.enrolledSubjects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No enrolled subjects.</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  {selectedStudentProfile.enrolledSubjects.map((s) => (
                    <li key={s.id}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {s.name} ({s.class_start_time || '--'} - {s.class_end_time || '--'})
                      </Typography>
                    </li>
                  ))}

                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProfile} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
      <Button component={Link} to="/" variant="outlined" color="inherit">
        Back to Dashboard
      </Button>
    </Container>
  );
}

export default App;

