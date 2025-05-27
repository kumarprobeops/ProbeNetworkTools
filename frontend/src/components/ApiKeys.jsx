import React, { useState, useEffect } from 'react';
import {
  Box, Container, Paper, Typography, Button, TextField, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle, Grid,
  FormControl, InputLabel, Select, MenuItem, Checkbox, Tooltip, useTheme,
  alpha, CircularProgress, Alert, Snackbar, Stack, TableContainer, Table,
  TableHead, TableRow, TableCell, TableBody, Toolbar, IconButton, Chip
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, FileCopy as CopyIcon,
  ToggleOn as EnableIcon, ToggleOff as DisableIcon, Refresh as RefreshIcon,
  LockOpen as EnabledIcon, Lock as DisabledIcon
} from '@mui/icons-material';

import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  deactivateApiKey,
  activateApiKey,
} from '../services/api';

const ApiKeys = () => {
  const theme = useTheme();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [formData, setFormData] = useState({ name: '', expires_days: 30 });
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all keys from backend on mount
  const fetchApiKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const keys = await getApiKeys();
      setApiKeys(Array.isArray(keys) ? keys : []);
    } catch (err) {
      setError('Failed to load API tokens. Please try again.');
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  // Refresh keys
  const refreshApiKeys = async () => {
    setRefreshing(true);
    await fetchApiKeys();
    setRefreshing(false);
    showNotification('API tokens refreshed successfully', 'success');
  };

  useEffect(() => { fetchApiKeys(); }, []);

  const showNotification = (message, severity = 'success') => setNotification({ open: true, message, severity });
  const handleCloseNotification = () => setNotification({ ...notification, open: false });

  // Create dialog
  const handleCreateDialogOpen = () => {
    setOpenCreateDialog(true);
    setFormData({ name: '', expires_days: 30 });
    setFormErrors({});
  };
  const handleCreateDialogClose = () => setOpenCreateDialog(false);

  // Delete dialog
  const handleDeleteDialogOpen = (apiKey) => { setSelectedKey(apiKey); setOpenDeleteDialog(true); };
  const handleDeleteDialogClose = () => { setOpenDeleteDialog(false); setSelectedKey(null); };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: '' });
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'API key name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create new API key
  const handleCreateApiKey = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const newApiKey = await createApiKey(formData);
      setApiKeys([newApiKey, ...apiKeys]);
      handleCreateDialogClose();
      showNotification(`API token "${newApiKey.name}" created successfully`);
    } catch (err) {
        let msg = 'Failed to create API token.';
        // Check for backend error message (detail)
        if (err && err.message) {
          msg += ' ' + err.message;
        }
        setFormErrors({ ...formErrors, submit: msg });
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDeleteApiKey = async () => {
    if (!selectedKey) return;
    setLoading(true);
    try {
      await deleteApiKey(selectedKey.id);
      setApiKeys(apiKeys.filter(key => key.id !== selectedKey.id));
      handleDeleteDialogClose();
      showNotification(`API token "${selectedKey.name}" deleted successfully`);
    } catch (err) {
      setError('Failed to delete API token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Activate/Deactivate
  const handleDeactivateApiKey = async (apiKey) => {
    setLoading(true);
    try {
      const updatedKey = await deactivateApiKey(apiKey.id);
      setApiKeys(apiKeys.map(key => key.id === updatedKey.id ? updatedKey : key));
      showNotification(`API token "${apiKey.name}" deactivated successfully`);
    } catch (err) {
      setError('Failed to deactivate API token. Please try again.');
      showNotification('Failed to deactivate API token', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleActivateApiKey = async (apiKey) => {
    setLoading(true);
    try {
      const updatedKey = await activateApiKey(apiKey.id);
      setApiKeys(apiKeys.map(key => key.id === updatedKey.id ? updatedKey : key));
      showNotification(`API token "${apiKey.name}" activated successfully`);
    } catch (err) {
      setError('Failed to activate API token. Please try again.');
      showNotification('Failed to activate API token', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleToggleApiKey = (apiKey) => apiKey.is_active ? handleDeactivateApiKey(apiKey) : handleActivateApiKey(apiKey);

  // Copy
  const handleCopyApiKey = (apiKey) => {
    navigator.clipboard.writeText(apiKey.key)
      .then(() => showNotification(`Copied ${apiKey.name} to clipboard!`))
      .catch(() => showNotification('Failed to copy to clipboard', 'error'));
  };

  // Table rendering (same as you already have)
  const renderApiKeysTable = () => (
    <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
      <Toolbar>
        <Typography sx={{ flex: '1 1 100%' }} variant="h6" component="div">API Tokens</Typography>
        <Tooltip title="Refresh API tokens">
          <IconButton onClick={refreshApiKeys} disabled={refreshing}>
            {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Token</TableCell>
              <TableCell>Expiration</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell>{apiKey.name}</TableCell>
                <TableCell>
                  <Chip
                    icon={apiKey.is_active ? <EnabledIcon /> : <DisabledIcon />}
                    label={apiKey.is_active ? "Active" : "Inactive"}
                    color={apiKey.is_active ? "success" : "error"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box component="code" sx={{
                    display: 'flex', alignItems: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    px: 1, py: 0.5, borderRadius: 1, fontSize: '0.85rem',
                    fontFamily: 'monospace'
                  }}>
                    <Box component="span" sx={{ mr: 1, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {apiKey.key}
                    </Box>
                    <IconButton size="small" onClick={() => handleCopyApiKey(apiKey)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  {apiKey.expires_at ? new Date(apiKey.expires_at).toLocaleDateString() : <Typography variant="body2" color="text.secondary">Never</Typography>}
                </TableCell>
                <TableCell>
                  {new Date(apiKey.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title={apiKey.is_active ? "Disable" : "Enable"}>
                      <IconButton size="small" color={apiKey.is_active ? "warning" : "success"}
                        onClick={() => handleToggleApiKey(apiKey)}>
                        {apiKey.is_active ? <DisableIcon /> : <EnableIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDeleteDialogOpen(apiKey)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  if (loading && apiKeys.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>API Tokens</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateDialogOpen}>
          Create New Token
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {apiKeys.length === 0
        ? <Paper sx={{ p: 6, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary" gutterBottom>No API Tokens Yet</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateDialogOpen} size="large" sx={{ mt: 2 }}>Create API Token</Button>
        </Paper>
        : renderApiKeysTable()}
      {/* Create API Token Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCreateDialogClose}>
        <DialogTitle>Create New API Token</DialogTitle>
        <DialogContent>
          <DialogContentText>
            API tokens are used to authenticate requests to the ProbeOps API. Choose a descriptive name and expiration period.
          </DialogContentText>
          {formErrors.submit && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{formErrors.submit}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus name="name" label="API Token Name" fullWidth variant="outlined"
                value={formData.name} onChange={handleFormChange}
                error={!!formErrors.name} helperText={formErrors.name} required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="expires-days-label">Expires After</InputLabel>
                <Select
                  labelId="expires-days-label"
                  name="expires_days"
                  value={formData.expires_days}
                  label="Expires After"
                  onChange={handleFormChange}
                >
                  <MenuItem value={30}>30 days</MenuItem>
                  <MenuItem value={60}>60 days</MenuItem>
                  <MenuItem value={90}>90 days</MenuItem>
                  <MenuItem value={180}>180 days</MenuItem>
                  <MenuItem value={365}>1 year</MenuItem>
                  <MenuItem value={0}>Never (not recommended)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCreateDialogClose} variant="outlined">Cancel</Button>
          <Button onClick={handleCreateApiKey} variant="contained" color="primary" disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}>
            {loading ? 'Creating...' : 'Create API Token'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleDeleteDialogClose}>
        <DialogTitle>Delete API Token?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the API token "{selectedKey?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDeleteDialogClose} variant="outlined">Cancel</Button>
          <Button onClick={handleDeleteApiKey} variant="contained" color="error" disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}>
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Notification Snackbar */}
      <Snackbar open={notification.open} autoHideDuration={5000} onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseNotification} severity={notification.severity} variant="filled" sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ApiKeys;
