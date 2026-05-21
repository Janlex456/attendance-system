import { useState, useEffect } from 'react';
import { Container, Typography, Paper, Alert, Button, Card, CardContent, Grid, Select, MenuItem, FormControl, InputLabel, Box, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import axios from 'axios';

const QRCodeGenerator = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [qrImage, setQrImage] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const axiosInstance = axios.create({
    baseURL: '/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axiosInstance.get('/auth/students');
        setStudents(res.data);
      } catch (err) {
        setError('Failed to load students');
      }
    };
    fetchStudents();
  }, []);

  const generateQR = async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');
    setQrImage(null);
    setQrData(null);

    try {
      // Generate QR code using student's single QR (works for all subjects)
      const res = await axiosInstance.post('/qr/generate', {
        studentId: selectedStudent
      });

      setQrImage(res.data.qrImage);
      setQrData(res.data.qrData);
      setStatus('QR code generated successfully! (One QR works for all subjects)');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrImage) return;

    const link = document.createElement('a');
    link.href = qrImage;
    const student = students.find(s => s.id === parseInt(selectedStudent));
    link.download = `QR_${student?.full_name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQR = () => {
    if (!qrImage) return;

    const printWindow = window.open('', '', 'width=600,height=600');
    const student = students.find(s => s.id === parseInt(selectedStudent));
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${student?.full_name}</title>
          <style>
            body { text-align: center; font-family: Arial; padding: 20px; }
            img { max-width: 400px; margin: 20px 0; }
            h2 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <h2>${student?.full_name}</h2>
          <p>Student ID: ${student?.student_id}</p>
          <p>Year Level: ${student?.grade_level || 'N/A'}</p>
          <p style="color: green;">One QR works for ALL subjects</p>
          <img src="${qrImage}" />
          <p style="font-size: 12px; margin-top: 30px;">Generated on ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Container maxWidth="md" sx={{ pt: 4, pb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Generate Student QR Codes
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate ONE QR code per student that works for ALL subjects.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {status && <Alert severity="success" sx={{ mb: 2 }}>{status}</Alert>}

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Select Student</InputLabel>
              <Select
                value={selectedStudent}
                label="Select Student"
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  setQrImage(null);
                  setQrData(null);
                }}
              >
                <MenuItem value="">-- Choose Student --</MenuItem>
                {students.map(student => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.full_name} ({student.student_id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={generateQR}
            disabled={!selectedStudent || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Generate QR Code'}
          </Button>
        </Box>

        {qrImage && (
          <Card sx={{ mt: 4, bgcolor: '#228B22', color: '#ffffff' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                QR Code Generated
              </Typography>
              <img src={qrImage} alt="QR Code" style={{ maxWidth: '300px', margin: '20px 0' }} />
              <Typography variant="body2" sx={{ my: 2 }}>
                Student: <strong>{students.find(s => s.id === parseInt(selectedStudent))?.full_name}</strong>
              </Typography>
              <Typography variant="body2">
                ID: <strong>{students.find(s => s.id === parseInt(selectedStudent))?.student_id}</strong>
              </Typography>
              <Typography variant="body2">
                Year Level: <strong>{students.find(s => s.id === parseInt(selectedStudent))?.grade_level || 'N/A'}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                ✅ Works for ALL subjects
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, fontSize: '12px', fontStyle: 'italic' }}>
                QR Data: {qrData}
              </Typography>
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={downloadQR}
                >
                  Download
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={printQR}
                >
                  Print
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>
    </Container>
  );
};

export default QRCodeGenerator;
