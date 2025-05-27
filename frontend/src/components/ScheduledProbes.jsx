import React, { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Select, MenuItem, FormControlLabel, Switch, Snackbar, Chip, CircularProgress, Box, Tooltip, Checkbox, Typography
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { getScheduledProbes, createScheduledProbe, updateScheduledProbe, deleteScheduledProbe, toggleScheduledProbe } from '../services/api';

// Interval and tool options
const intervalOptions = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 60, label: 'Every 1 hour' },
  { value: 1440, label: 'Every 1 day' }
];

const toolOptions = [
  { value: 'ping', label: 'Ping' },
  { value: 'traceroute', label: 'Traceroute' },
  { value: 'dns', label: 'DNS Lookup' },
  { value: 'rdns', label: 'Reverse DNS' },
  { value: 'whois', label: 'Whois Lookup' },
  { value: 'curl', label: 'Curl' },
  { value: 'nmap', label: 'Port Check (Nmap)' }
];

function getTimeSince(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const isValidIp = (str) =>
  /^(\d{1,3}\.){3}\d{1,3}$/.test(str) ||
  /^[0-9a-fA-F:]+$/.test(str);

const isValidHostname = (str) =>
  /^([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/.test(str);

const isValidUrl = (str) =>
  /^(https?:\/\/)?([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/.test(str);

const isValidPort = (port) =>
  /^\d+$/.test(port) && +port > 0 && +port < 65536;

const isValidPorts = (ports) => {
  if (!ports) return true;
  const arr = ports.split(',').map((p) => p.trim()).filter(Boolean);
  if (arr.length > 3) return false;
  return arr.every(isValidPort);
};

const getTargetPropsByTool = (tool) => {
  switch (tool) {
    case 'rdns':
      return {
        label: "IP Address",
        helperText: "Enter a valid IPv4 or IPv6 address.",
        required: true,
        validate: isValidIp
      };
    case 'curl':
      return {
        label: "URL",
        helperText: "Enter the URL to fetch (http(s)://...).",
        required: true,
        validate: isValidUrl
      };
    case 'nmap':
      return {
        label: "Hostname/IP",
        helperText: "Target hostname or IP address.",
        required: true,
        validate: (val) => isValidIp(val) || isValidHostname(val)
      };
    case 'dns':
    case 'ping':
    case 'traceroute':
      return {
        label: "Hostname or IP",
        helperText: "Enter a valid hostname or IP.",
        required: true,
        validate: (val) => isValidIp(val) || isValidHostname(val)
      };
    case 'whois':
      return {
        label: "Domain or IP",
        helperText: "Enter a domain name or IP.",
        required: true,
        validate: (val) => isValidIp(val) || isValidHostname(val)
      };
    default:
      return {
        label: "Target",
        helperText: "",
        required: true,
        validate: () => true
      };
  }
};

const curlMethods = ['GET', 'POST', 'HEAD', 'PUT', 'DELETE', 'PATCH'];

const ScheduledProbes = () => {
  const [probes, setProbes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProbe, setSelectedProbe] = useState(null);
  const [form, setForm] = useState({
    name: '',
    tool: 'ping',
    target: '',
    interval_minutes: 5,
    is_active: true,
    alert_on_failure: false,
    alert_on_threshold: false,
    threshold_value: null,
    description: '',
    curlMethod: 'GET',
    curlHeaders: '',
    nmapPorts: ''
  });
  const [formError, setFormError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchProbes(); }, []);

  const fetchProbes = async () => {
    setLoading(true);
    try {
      const res = await getScheduledProbes();
      const sorted = [...(res || [])].sort((a, b) => b.id - a.id);
      setProbes(sorted);
    } catch (err) {
      let msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Unknown error";
      setSnackbar({ open: true, message: msg, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (probe = null) => {
    if (probe && probe.id) {
      setEditMode(true);
      setSelectedProbe(probe);
      setForm({
        name: probe.name,
        tool: probe.tool,
        target: probe.target,
        interval_minutes: probe.interval_minutes,
        is_active: probe.is_active,
        alert_on_failure: probe.alert_on_failure,
        alert_on_threshold: probe.alert_on_threshold ?? false,
        threshold_value: probe.threshold_value ?? null,
        description: probe.description || '',
        curlMethod: probe.curlMethod || 'GET',
        curlHeaders: probe.curlHeaders || '',
        nmapPorts: probe.nmapPorts || ''
      });
      setFormError('');
      setOpenDialog(true);
    } else {
      setEditMode(false);
      setSelectedProbe(null);
      setForm({
        name: '',
        tool: 'ping',
        target: '',
        interval_minutes: 5,
        is_active: true,
        alert_on_failure: false,
        alert_on_threshold: false,
        threshold_value: null,
        description: '',
        curlMethod: 'GET',
        curlHeaders: '',
        nmapPorts: ''
      });
      setFormError('');
      setOpenDialog(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProbe(null);
    setFormError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Dynamic validation
    const { tool, target, nmapPorts } = form;
    const { validate, label } = getTargetPropsByTool(tool);

    if (!validate(target)) {
      setFormError(`Please provide a valid ${label}.`);
      return;
    }
    if (tool === 'nmap' && nmapPorts && !isValidPorts(nmapPorts)) {
      setFormError('Please enter 1-3 valid ports (1-65535), comma separated.');
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      let payload = {
        ...form,
        interval_minutes: parseInt(form.interval_minutes, 10),
        alert_on_threshold: !!form.alert_on_threshold,
        threshold_value: form.threshold_value !== undefined ? form.threshold_value : null
      };

      // Add extra fields for curl/nmap
      if (tool === 'curl') {
        payload.curlMethod = form.curlMethod || 'GET';
        payload.curlHeaders = form.curlHeaders || '';
      }
      if (tool === 'nmap') {
        payload.nmapPorts = form.nmapPorts || '';
      }

      if (editMode && selectedProbe && selectedProbe.id) {
        await updateScheduledProbe(selectedProbe.id, payload);
        setOpenDialog(false);
        await fetchProbes();
        setSnackbar({ open: true, message: 'Scheduled probe updated', severity: 'success' });
      } else {
        await createScheduledProbe(payload);
        setOpenDialog(false);
        await fetchProbes();
        setSnackbar({ open: true, message: 'Scheduled probe created', severity: 'success' });
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Unknown error";
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
    setLoading(false);
  };

  // --- TABLE SECTION: Robust, never blank! ---
  return (
    <div style={{ position: 'relative' }}>
      <Typography variant="h5" gutterBottom>
        Scheduled Probes
        <Tooltip title="Refresh">
          <IconButton onClick={fetchProbes} disabled={loading} size="small" sx={{ ml: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ ml: 2 }}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          New Probe
        </Button>
      </Typography>
      {loading ? (
        <Box textAlign="center" p={5}>
          <CircularProgress />
        </Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Tool</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Interval</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Last Result</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {probes && probes.length > 0 ? (
              probes.map((probe) => {
                const lastResult =
                  probe.probe_results && probe.probe_results.length > 0
                    ? probe.probe_results[probe.probe_results.length - 1]
                    : null;
                return (
                  <TableRow key={probe.id}>
                    <TableCell>{probe.name}</TableCell>
                    <TableCell>{probe.tool}</TableCell>
                    <TableCell>{probe.target}</TableCell>
                    <TableCell>
                      {intervalOptions.find(i => i.value === probe.interval_minutes)?.label || probe.interval_minutes + " min"}
                    </TableCell>
                    <TableCell>
                      {probe.is_active
                        ? <Chip label="Active" color="success" size="small" />
                        : <Chip label="Paused" color="default" size="small" />}
                    </TableCell>
                    <TableCell>
                      {lastResult
                        ? getTimeSince(lastResult.created_at)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {lastResult
                        ? (
                          <Tooltip title={lastResult.result || ""} arrow>
                            <span>
                              {lastResult.status === 'success'
                                ? <Chip label="Success" color="success" size="small" />
                                : <Chip label="Failure" color="error" size="small" />}
                            </span>
                          </Tooltip>
                        )
                        : <Chip label="No Result" size="small" />}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <span>
                          <IconButton
                            onClick={() => handleOpenDialog(probe)}
                            disabled={loading}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={probe.is_active ? "Pause" : "Resume"}>
                        <span>
                          <IconButton
                            onClick={async () => {
                              await toggleScheduledProbe(probe.id);
                              await fetchProbes();
                            }}
                            disabled={loading}
                            size="small"
                          >
                            <Switch checked={probe.is_active} size="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <span>
                          <IconButton
                            onClick={async () => {
                              await deleteScheduledProbe(probe.id);
                              await fetchProbes();
                            }}
                            disabled={loading}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">No scheduled probes found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* --- CREATE/EDIT DIALOG (unchanged from your last version) --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? "Edit Scheduled Probe" : "New Scheduled Probe"}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required
              disabled={loading}
            />
            <Select
              label="Tool"
              name="tool"
              value={form.tool}
              onChange={handleChange}
              fullWidth
              style={{ marginBottom: 16 }}
              disabled={loading}
            >
              {toolOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
            {/* --- DYNAMIC TARGET FIELD --- */}
            <TextField
              label={getTargetPropsByTool(form.tool).label}
              name="target"
              value={form.target}
              onChange={handleChange}
              fullWidth
              margin="normal"
              required={getTargetPropsByTool(form.tool).required}
              helperText={getTargetPropsByTool(form.tool).helperText}
              error={!!formError}
              disabled={loading}
            />
            {/* --- EXTRA: Nmap Port(s) --- */}
            {form.tool === 'nmap' && (
              <TextField
                label="Port(s)"
                name="nmapPorts"
                value={form.nmapPorts}
                onChange={handleChange}
                fullWidth
                margin="normal"
                placeholder="e.g., 80,443,22 (max 3 ports)"
                helperText="Enter up to 3 ports, comma separated."
                disabled={loading}
              />
            )}
            {/* --- EXTRA: Curl method/headers --- */}
            {form.tool === 'curl' && (
              <>
                <Select
                  label="HTTP Method"
                  name="curlMethod"
                  value={form.curlMethod}
                  onChange={handleChange}
                  fullWidth
                  style={{ marginBottom: 16 }}
                  disabled={loading}
                >
                  {curlMethods.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
                <TextField
                  label="Headers (optional)"
                  name="curlHeaders"
                  value={form.curlHeaders}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  placeholder="Header1: value1\nHeader2: value2"
                  multiline
                  rows={2}
                  helperText="Optional: Custom HTTP headers (one per line: Header: value)"
                  disabled={loading}
                />
              </>
            )}
            <Select
              label="Interval"
              name="interval_minutes"
              value={form.interval_minutes}
              onChange={handleChange}
              fullWidth
              style={{ marginBottom: 16 }}
              disabled={loading}
            >
              {intervalOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              margin="normal"
              disabled={loading}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  name="is_active"
                  color="primary"
                  disabled={loading}
                />
              }
              label="Active"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.alert_on_failure}
                  onChange={e => setForm(prev => ({ ...prev, alert_on_failure: e.target.checked }))}
                  name="alert_on_failure"
                  color="secondary"
                  disabled={loading}
                />
              }
              label="Alert on Failure"
            />
            {formError && (
              <Box sx={{ color: 'error.main', fontSize: 13, mt: 1, mb: 1 }}>
                {formError}
              </Box>
            )}
            <DialogActions>
              <Button onClick={handleCloseDialog} disabled={loading}>Cancel</Button>
              <Button type="submit" color="primary" variant="contained" disabled={loading}>
                {editMode ? "Update" : "Create"}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </div>
  );
};

export default ScheduledProbes;
