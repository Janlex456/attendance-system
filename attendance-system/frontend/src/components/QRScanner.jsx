import { useEffect, useMemo, useRef, useState } from "react";
import { Container, Typography, Paper, Alert, Card, CardContent, Box } from "@mui/material";
import axios from "axios";

const QRScanner = ({ onScanStudentId } ) => {
  const [status, setStatus] = useState("Ready for scan...");
  const [lastScan, setLastScan] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [scannedData, setScannedData] = useState("");

  const token = localStorage.getItem("token");
  const axiosInstance = useMemo(
    () =>
      axios.create({
        baseURL: "/api",
        headers: { Authorization: `Bearer ${token}` },
      }),
    [token]
  );

  // USB barcode/QR scanners often behave like a keyboard.
  // They “type” the decoded payload quickly and usually end with Enter.
  const scanBufferRef = useRef("");
  const scanTimerRef = useRef(null);
  const lastPayloadRef = useRef({ payload: "", at: 0 });

  const handleScan = async (qrData) => {
    const now = Date.now();
    if (
      lastPayloadRef.current.payload === qrData &&
      now - lastPayloadRef.current.at < 6000
    ) {
      return;
    }
    lastPayloadRef.current = { payload: qrData, at: now };

    setScannedData(qrData);
    setStatus("Processing scan...");

    try {
      const res = await axiosInstance.post("/attendance/scan-auto", { qrData });
      const msg = res.data.message || "Scan processed";
      const action = res.data.action;

      if (action === "end_scanned") {
        setStatus(`✅ TIME OUT RECORDED - ${msg}`);
      } else if (res.data.requiresEndRescan) {
        setStatus(`⚠️ END SCAN REQUIRED - ${msg}`);
      } else {
        setStatus(msg);
      }

      setLastScan(new Date().toLocaleString());
      setStudentInfo(res.data);

      const studentIdForProfile = res.data?.student?.id;
      if (studentIdForProfile && typeof onScanStudentId === 'function') {
        onScanStudentId(studentIdForProfile);
      }


      new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMc"
      )
        .play()
        .catch(() => {});
    } catch (err) {
      setStatus(err.response?.data?.error || "Scan failed");
    }
  };



  useEffect(() => {
    setStatus("Ready for USB scan...");

    const isTypingInInput = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || el.isContentEditable;
    };

    const flush = async () => {
      const payload = scanBufferRef.current.trim();
      scanBufferRef.current = "";
      if (!payload) return;
      await handleScan(payload);
    };

    const onKeyDown = (e) => {
      // Avoid interfering with normal typing
      if (isTypingInInput(document.activeElement)) return;

      // Most scanners send Enter at the end
      if (e.key === "Enter") {
        e.preventDefault();
        if (scanTimerRef.current) {
          clearTimeout(scanTimerRef.current);
          scanTimerRef.current = null;
        }
        flush();
        return;
      }

      // Ignore non-character keys
      if (e.key.length !== 1) return;

      scanBufferRef.current += e.key;

      // If scanner pauses, assume scan ended
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => {
        flush();
      }, 120);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axiosInstance]);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Student Scan Station
        </Typography>
        <Typography variant="body1" gutterBottom>
          Use the connected USB QR scanner. Click anywhere on this page, then scan.
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          Status: <strong>{status}</strong>
        </Alert>

        {/* Always render details when we have studentInfo, regardless of status text */}
        {studentInfo ? (
          <Card sx={{ mt: 2, bgcolor: "#228B22", color: "#ffffff" }}>
            <CardContent>
              <Typography variant="h6">Student Details</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Name: <strong>{studentInfo.student?.full_name}</strong>
              </Typography>
              <Typography variant="body2">
                ID: <strong>{studentInfo.student?.student_id}</strong>
              </Typography>
              <Typography variant="body2">
                Year Level:{" "}
                <strong>{studentInfo.student?.yearLevel || studentInfo.student?.year_level || "N/A"}</strong>
              </Typography>
              <Typography variant="body2">
                Subject: <strong>{studentInfo.subject?.name}</strong>
              </Typography>
              <Typography variant="body2">
                Time: <strong>{studentInfo.timestamp ? new Date(studentInfo.timestamp).toLocaleString() : "N/A"}</strong>
              </Typography>
            </CardContent>
          </Card>
        ) : lastScan ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            Last scan: {lastScan}
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Waiting for scan...
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
            Scanned data: {scannedData || "waiting"}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default QRScanner;

