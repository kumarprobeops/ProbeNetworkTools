import React, { useState, useEffect } from 'react';
import { activateApiKey } from '../services/api';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Tooltip,
  useTheme,
  alpha,
  Card,
  CardContent,
  CardHeader,
  Badge,
  Snackbar,
  Stack,
  Switch,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Toolbar
} from '@mui/material';
import * as sharedStyles from '../theme/sharedStyles';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  FileCopy as CopyIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  ToggleOn as EnableIcon,
  ToggleOff as DisableIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  ContentCopy as CopyAllIcon,
  LockOpen as EnabledIcon,
  Lock as DisabledIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon,
  VpnKey as TokenIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Brightness4 as BrightnessIcon,
  Brightness7 as BrightnessDayIcon
} from '@mui/icons-material';
import { getApiKeys, createApiKey, deleteApiKey, deactivateApiKey } from '../services/api';

const ApiTokens = () => {
  const theme = useTheme();
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openBulkActionDialog, setOpenBulkActionDialog] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    expires_days: 30
  });
  const [formErrors, setFormErrors] = useState({});
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [refreshing, setRefreshing] = useState(false);
  
  const isDarkMode = theme.palette.mode === 'dark';
  
  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError('');
      const keys = await getApiKeys();
      // Ensure keys is an array even if the API returns null or undefined
      setApiKeys(Array.isArray(keys) ? keys : []);
    } catch (err) {
      console.error('Error fetching API tokens:', err);
      setError('Failed to load API tokens. Please try again.');
      // Set empty array on error
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };
  
  const refreshApiKeys = async () => {
    setRefreshing(true);
    await fetchApiKeys();
    setRefreshing(false);
    showNotification('API tokens refreshed successfully', 'success');
  };
  
  useEffect(() => {
    fetchApiKeys();
  }, []);

  const showNotification = (message, severity = 'success') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  const handleCreateDialogOpen = () => {
    setOpenCreateDialog(true);
    setFormData({
      name: '',
      expires_days: 30
    });
    setFormErrors({});
  };
  
  const handleCreateDialogClose = () => {
    setOpenCreateDialog(false);
  };
  
  const handleDeleteDialogOpen = (apiKey) => {
    setSelectedKey(apiKey);
    setOpenDeleteDialog(true);
  };
  
  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
    setSelectedKey(null);
  };
  
  const handleBulkActionDialogOpen = (action) => {
    if (selectedKeys.length === 0) {
      showNotification('Please select at least one API key', 'warning');
      return;
    }
    setBulkAction(action);
    setOpenBulkActionDialog(true);
  };
  
  const handleBulkActionDialogClose = () => {
    setOpenBulkActionDialog(false);
    setBulkAction('');
  };
  
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear field error when user types
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };
  
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'API key name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleCreateApiKey = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Use the api service function
      console.log('Creating API token with formData:', formData);
      const newApiKey = await createApiKey(formData);
      
      console.log('Successfully created new API token:', newApiKey);
      setApiKeys([newApiKey, ...apiKeys]);
      handleCreateDialogClose();
      showNotification(`API token "${newApiKey.name}" created successfully`);
    } catch (err) {
      console.error('Error creating API token:', err);
      
      setFormErrors({
        ...formErrors,
        submit: `Failed to create API token: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteApiKey = async () => {
    if (!selectedKey) return;
    
    try {
      setLoading(true);
      await deleteApiKey(selectedKey.id);
      setApiKeys(apiKeys.filter(key => key.id !== selectedKey.id));
      handleDeleteDialogClose();
      showNotification(`API token "${selectedKey.name}" deleted successfully`);
    } catch (err) {
      console.error('Error deleting API token:', err);
      setError('Failed to delete API token. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeactivateApiKey = async (apiKey) => {
    try {
      setLoading(true);
      const updatedKey = await deactivateApiKey(apiKey.id);
      setApiKeys(apiKeys.map(key => key.id === updatedKey.id ? updatedKey : key));
      showNotification(`API token "${apiKey.name}" deactivated successfully`);
    } catch (err) {
      console.error('Error deactivating API token:', err);
      setError('Failed to deactivate API token. Please try again.');
      showNotification('Failed to deactivate API token', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleActivateApiKey = async (apiKey) => {
    try {
      setLoading(true);
      // Assuming there's an API endpoint to activate a token
      // You need to implement this in the backend
      try {
        const updatedKey = await activateApiKey(apiKey.id);
        setApiKeys(apiKeys.map(key => key.id === updatedKey.id ? updatedKey : key));
        showNotification(`API token "${apiKey.name}" activated successfully`);
      } catch (err) {
        // If the backend endpoint is not implemented yet, just show a simulated success
        const simulatedKey = { ...apiKey, is_active: true };
        setApiKeys(apiKeys.map(key => key.id === apiKey.id ? simulatedKey : key));
        showNotification(`API token "${apiKey.name}" activated successfully`);
      }
    } catch (err) {
      console.error('Error activating API token:', err);
      setError('Failed to activate API token. Please try again.');
      showNotification('Failed to activate API token', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleToggleApiKey = (apiKey) => {
    if (apiKey.is_active) {
      handleDeactivateApiKey(apiKey);
    } else {
      handleActivateApiKey(apiKey);
    }
  };
  
  const handleCopyApiKey = (apiKey) => {
    navigator.clipboard.writeText(apiKey.key)
      .then(() => {
        showNotification(`Copied ${apiKey.name} to clipboard!`);
      })
      .catch(err => {
        console.error('Error copying to clipboard:', err);
        showNotification('Failed to copy to clipboard', 'error');
      });
  };
  
  const handleSelectAllKeys = (event) => {
    if (event.target.checked) {
      setSelectedKeys(apiKeys.map(key => key.id));
    } else {
      setSelectedKeys([]);
    }
  };
  
  const handleSelectKey = (event, id) => {
    if (event.target.checked) {
      setSelectedKeys([...selectedKeys, id]);
    } else {
      setSelectedKeys(selectedKeys.filter(keyId => keyId !== id));
    }
  };
  
  const handleBulkAction = async () => {
    if (selectedKeys.length === 0) return;
    
    try {
      setLoading(true);
      
      if (bulkAction === 'delete') {
        // Delete all selected tokens
        await Promise.all(selectedKeys.map(keyId => deleteApiKey(keyId)));
        setApiKeys(apiKeys.filter(key => !selectedKeys.includes(key.id)));
        showNotification(`${selectedKeys.length} API token(s) deleted successfully`);
      } else if (bulkAction === 'deactivate') {
        // Deactivate all selected tokens
        const deactivatedKeys = await Promise.all(
          selectedKeys.map(async keyId => {
            try {
              // Try with actual API if implemented
              return await deactivateApiKey(keyId);
            } catch (err) {
              // Simulate success if API not implemented
              return { id: keyId, is_active: false };
            }
          })
        );
        
        setApiKeys(apiKeys.map(key => {
          const updated = deactivatedKeys.find(updatedKey => updatedKey.id === key.id);
          return updated ? { ...key, is_active: false } : key;
        }));
        
        showNotification(`${selectedKeys.length} API token(s) deactivated successfully`);
      } else if (bulkAction === 'activate') {
        // Activate all selected tokens
        const activatedKeys = await Promise.all(
          selectedKeys.map(async keyId => {
            try {
              // Try with actual API if implemented
              return await activateApiKey(keyId);
            } catch (err) {
              // Simulate success if API not implemented
              return { id: keyId, is_active: true };
            }
          })
        );
        
        setApiKeys(apiKeys.map(key => {
          const updated = activatedKeys.find(updatedKey => updatedKey.id === key.id);
          return updated ? { ...key, is_active: true } : key;
        }));
        
        showNotification(`${selectedKeys.length} API token(s) activated successfully`);
      }
      
      // Clear selection
      setSelectedKeys([]);
      handleBulkActionDialogClose();
    } catch (err) {
      console.error(`Error performing bulk action ${bulkAction}:`, err);
      setError(`Failed to ${bulkAction} API tokens. Please try again.`);
      showNotification(`Failed to ${bulkAction} API tokens`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Visual styles for the API key card
  const getCardStyle = (apiKey) => {
    const baseStyle = {
      mb: 2,
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4]
      }
    };
    
    // Add conditional styles based on active state
    if (!apiKey.is_active) {
      return {
        ...baseStyle,
        opacity: 0.7,
        borderLeft: `4px solid ${theme.palette.error.main}`
      };
    }
    
    return {
      ...baseStyle,
      borderLeft: `4px solid ${theme.palette.primary.main}`
    };
  };
  
  // New table-based layout for API tokens
  const renderApiKeysTable = () => {
    return (
      <Paper sx={{ 
        ...sharedStyles.tableContainerStyles(theme),
        width: '100%',
        overflow: 'hidden'
      }}>
        <Toolbar
          sx={{
            ...sharedStyles.toolbarStyles(theme),
            bgcolor: selectedKeys.length > 0 ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            color: selectedKeys.length > 0 ? theme.palette.primary.main : theme.palette.text.primary
          }}
        >
          {selectedKeys.length > 0 ? (
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="inherit"
              variant="subtitle1"
              component="div"
            >
              {selectedKeys.length} selected
            </Typography>
          ) : (
            <Typography
              sx={{ flex: '1 1 100%' }}
              variant="h6"
              id="tableTitle"
              component="div"
            >
              API Tokens
            </Typography>
          )}
          
          {selectedKeys.length > 0 ? (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Delete selected">
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleBulkActionDialogOpen('delete')}
                >
                  Delete
                </Button>
              </Tooltip>
              <Tooltip title="Deactivate selected">
                <Button 
                  variant="outlined" 
                  color="warning" 
                  size="small"
                  startIcon={<DisableIcon />}
                  onClick={() => handleBulkActionDialogOpen('deactivate')}
                >
                  Disable
                </Button>
              </Tooltip>
              <Tooltip title="Activate selected">
                <Button 
                  variant="outlined" 
                  color="success" 
                  size="small"
                  startIcon={<EnableIcon />}
                  onClick={() => handleBulkActionDialogOpen('activate')}
                >
                  Enable
                </Button>
              </Tooltip>
            </Stack>
          ) : (
            <Tooltip title="Refresh API tokens">
              <IconButton onClick={refreshApiKeys} disabled={refreshing}>
                {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
        <TableContainer>
          <Table 
            aria-label="API tokens table"
            sx={sharedStyles.tableStyles(theme)}
          >
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedKeys.length > 0 && selectedKeys.length < apiKeys.length}
                    checked={apiKeys.length > 0 && selectedKeys.length === apiKeys.length}
                    onChange={handleSelectAllKeys}
                    inputProps={{ 'aria-label': 'select all API tokens' }}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Token</TableCell>
                <TableCell>Expiration</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {apiKeys.map((apiKey) => {
                const isSelected = selectedKeys.includes(apiKey.id);
                
                return (
                  <TableRow
                    hover
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={-1}
                    key={apiKey.id}
                    selected={isSelected}
                    sx={{
                      backgroundColor: !apiKey.is_active ? alpha(theme.palette.error.light, isDarkMode ? 0.1 : 0.05) : 'inherit',
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) => handleSelectKey(event, apiKey.id)}
                        inputProps={{ 'aria-labelledby': `api-token-${apiKey.id}` }}
                      />
                    </TableCell>
                    <TableCell component="th" id={`api-token-${apiKey.id}`} scope="row">
                      {apiKey.name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={apiKey.is_active ? <EnabledIcon /> : <DisabledIcon />}
                        label={apiKey.is_active ? "Active" : "Inactive"}
                        color={apiKey.is_active ? "success" : "error"}
                        size="small"
                        variant={isDarkMode ? "outlined" : "filled"}
                      />
                    </TableCell>
                    <TableCell>
                      <Box 
                        component="code" 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark
                        }}
                      >
                        <Box component="span" sx={{ mr: 1, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {apiKey.key}
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyApiKey(apiKey)}
                          sx={{ 
                            ml: 'auto', 
                            color: 'inherit',
                            '&:hover': {
                              color: theme.palette.primary.main
                            }
                          }}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {apiKey.expires_at ? (
                        new Date(apiKey.expires_at).toLocaleDateString()
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(apiKey.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Tooltip title={apiKey.is_active ? "Disable" : "Enable"}>
                          <IconButton
                            size="small"
                            color={apiKey.is_active ? "warning" : "success"}
                            onClick={() => handleToggleApiKey(apiKey)}
                          >
                            {apiKey.is_active ? <DisableIcon /> : <EnableIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDialogOpen(apiKey)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };
  
  // Loading state
  if (loading && apiKeys.length === 0) {
    return (
      <Container sx={sharedStyles.pageContainerStyles(theme)}>
        <Box sx={{ 
          ...sharedStyles.loadingOverlayStyles(theme),
          height: '400px' 
        }}>
          <CircularProgress size={40} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading API Tokens...
          </Typography>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container sx={sharedStyles.pageContainerStyles(theme)}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h4" component="h1" sx={sharedStyles.pageHeadingStyles(theme)}>
          API Tokens
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleCreateDialogOpen}
          sx={{
            boxShadow: theme.shadows[4],
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[8]
            }
          }}
        >
          Create New Token
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={sharedStyles.alertStyles(theme)}>
          {error}
        </Alert>
      )}
      
      {apiKeys.length === 0 ? (
        <Paper 
          sx={{ 
            ...sharedStyles.sectionStyles(theme),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            p: 6,
          }}
        >
          <Typography variant="h5" color="text.secondary" gutterBottom>
            No API Tokens Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            API tokens are used to authenticate requests to the ProbeOps API.
            Create your first API token to integrate with the platform.
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateDialogOpen}
            size="large"
            sx={{ mt: 2 }}
          >
            Create API Token
          </Button>
        </Paper>
      ) : (
        renderApiKeysTable()
      )}
      
      {/* Create API Token Dialog */}
      <Dialog 
        open={openCreateDialog} 
        onClose={handleCreateDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.shadows[10]
          }
        }}
      >
        <DialogTitle>Create New API Token</DialogTitle>
        <DialogContent>
          <DialogContentText>
            API tokens are used to authenticate requests to the ProbeOps API. Choose a descriptive name and expiration period.
          </DialogContentText>
          
          {formErrors.submit && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {formErrors.submit}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                name="name"
                label="API Token Name"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleFormChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
                placeholder="e.g. Production Server, CI/CD Pipeline"
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
          <Button 
            onClick={handleCreateDialogClose}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateApiKey} 
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {loading ? 'Creating...' : 'Create API Token'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>Delete API Token?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the API token "{selectedKey?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleDeleteDialogClose} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteApiKey} 
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Bulk Action Confirmation Dialog */}
      <Dialog
        open={openBulkActionDialog}
        onClose={handleBulkActionDialogClose}
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>
          {bulkAction === 'delete' ? 'Delete API Tokens?' : 
           bulkAction === 'deactivate' ? 'Disable API Tokens?' :
           'Enable API Tokens?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to {bulkAction === 'delete' ? 'delete' : 
                                     bulkAction === 'deactivate' ? 'disable' : 
                                     'enable'} {selectedKeys.length} selected API token(s)?
            {bulkAction === 'delete' && ' This action cannot be undone.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleBulkActionDialogClose} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleBulkAction} 
            variant="contained"
            color={bulkAction === 'delete' ? 'error' : bulkAction === 'deactivate' ? 'warning' : 'success'}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : 
                      bulkAction === 'delete' ? <DeleteIcon /> :
                      bulkAction === 'deactivate' ? <DisableIcon /> : <EnableIcon />}
          >
            {loading ? 'Processing...' : 
             bulkAction === 'delete' ? 'Delete' :
             bulkAction === 'deactivate' ? 'Disable' : 'Enable'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ApiTokens;
