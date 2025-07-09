import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Copy, Share2, BarChart3, Users, Calendar, FileText, Download, Send, Folder, FolderOpen, FolderPlus, Settings, Menu, Bot, Image as ImageIcon, Star, User, LogOut, TrendingUp, Activity, ChevronDown, ChevronRight, X, ArrowLeft, Grid as Grid3X3, List, SortAsc } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { formAPI, exportAPI, folderAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import FolderModal from './FolderModal';
import toast from 'react-hot-toast';

interface FormItem {
  _id: string;
  title: string;
  description: string;
  responses: number;
  views: number;
  createdAt: string;
  status: 'published' | 'draft' | 'closed';
  shareUrl?: string;
  folderId?: string;
}

interface FolderItem {
  _id: string;
  name: string;
  description: string;
  color: string;
  formCount: number;
  createdAt: string;
}

interface FormDashboardProps {
  onCreateForm: () => void;
  onEditForm: (id: string) => void;
  onViewResponses: (id: string) => void;
}

const FormDashboard: React.FC<FormDashboardProps> = ({ 
  onCreateForm, 
  onEditForm,
  onViewResponses 
}) => {
  const { user, logout, getInitials } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [forms, setForms] = useState<FormItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [openFolderModal, setOpenFolderModal] = useState<FolderItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    item: FormItem | null;
  }>({ show: false, x: 0, y: 0, item: null });

  useEffect(() => {
    loadData();
    // Close context menu on click outside
    const handleClickOutside = () => setContextMenu({ show: false, x: 0, y: 0, item: null });
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('FormDashboard: Loading forms and folders...');
      
      const [formsResponse, foldersResponse] = await Promise.allSettled([
        formAPI.getForms(),
        folderAPI.getFolders()
      ]);

      // Handle forms response
      if (formsResponse.status === 'fulfilled') {
        console.log('FormDashboard: Forms loaded successfully:', formsResponse.value.data.length, 'forms');
        setForms(formsResponse.value.data || []);
      } else {
        console.error('FormDashboard: Failed to load forms:', formsResponse.reason);
        toast.error('Failed to load forms');
        setForms([]);
      }

      // Handle folders response
      if (foldersResponse.status === 'fulfilled') {
        console.log('FormDashboard: Folders loaded successfully:', foldersResponse.value.data.length, 'folders');
        setFolders(foldersResponse.value.data || []);
      } else {
        console.error('FormDashboard: Failed to load folders:', foldersResponse.reason);
        setFolders([]);
      }

    } catch (error) {
      console.error('FormDashboard: Unexpected error loading data:', error);
      toast.error('Failed to load dashboard data');
      setForms([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (folderData: { name: string; description: string; color: string }) => {
    try {
      console.log('FormDashboard: Creating folder:', folderData);
      const response = await folderAPI.createFolder(folderData);
      setFolders([response.data, ...folders]);
      toast.success('Folder created successfully');
    } catch (error: any) {
      console.error('FormDashboard: Error creating folder:', error);
      toast.error(error.response?.data?.error || 'Failed to create folder');
    }
  };

  const updateFolder = async (folderData: { name: string; description: string; color: string }) => {
    if (!selectedFolder) return;
    
    try {
      console.log('FormDashboard: Updating folder:', selectedFolder._id, folderData);
      const response = await folderAPI.updateFolder(selectedFolder._id, folderData);
      setFolders(folders.map(f => f._id === selectedFolder._id ? response.data : f));
      toast.success('Folder updated successfully');
    } catch (error: any) {
      console.error('FormDashboard: Error updating folder:', error);
      toast.error(error.response?.data?.error || 'Failed to update folder');
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('FormDashboard: Deleting folder:', folderId);
      await folderAPI.deleteFolder(folderId);
      setFolders(folders.filter(f => f._id !== folderId));
      toast.success('Folder deleted successfully');
    } catch (error: any) {
      console.error('FormDashboard: Error deleting folder:', error);
      toast.error(error.response?.data?.error || 'Failed to delete folder');
    }
  };

  const deleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('FormDashboard: Deleting form:', formId);
      await formAPI.deleteForm(formId);
      setForms(forms.filter(form => form._id !== formId));
      toast.success('Form deleted successfully');
    } catch (error: any) {
      console.error('FormDashboard: Error deleting form:', error);
      toast.error(error.response?.data?.error || 'Failed to delete form');
    }
  };

  const copyShareLink = (shareUrl: string) => {
    const shareLink = `${window.location.origin}/form/${shareUrl}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Share link copied to clipboard!');
  };

  const duplicateForm = async (form: FormItem) => {
    try {
      const duplicatedForm = {
        ...form,
        title: `${form.title} (Copy)`,
        status: 'draft' as const
      };
      delete (duplicatedForm as any)._id;
      delete (duplicatedForm as any).shareUrl;
      
      const response = await formAPI.createForm(duplicatedForm);
      setForms([response.data, ...forms]);
      toast.success('Form duplicated successfully');
    } catch (error: any) {
      console.error('Error duplicating form:', error);
      toast.error('Failed to duplicate form');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FormItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
  };
  const handleItemClick = (itemId: string, itemType: 'form' | 'folder') => {
    if (itemType === 'folder') {
      const folder = folders.find(f => f._id === itemId);
      if (folder) {
        setOpenFolderModal(folder);
      }
    } else {
      onEditForm(itemId);
    }
  };

  const handleItemDoubleClick = (itemId: string, itemType: 'form' | 'folder') => {
    if (itemType === 'folder') {
      const folder = folders.find(f => f._id === itemId);
      if (folder) {
        setOpenFolderModal(folder);
      }
    } else {
      onEditForm(itemId);
    }
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    setDraggedItem(null);

    if (!destination) return;

    // If dropped in the same place, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const formId = draggableId.replace('form-', '');

    // If dropped on a folder
    if (destination.droppableId.startsWith('folder-')) {
      const folderId = destination.droppableId.replace('folder-', '');

      try {
        // Move form to folder
        await folderAPI.moveForms(folderId, [formId]);
        
        // Update local state
        setForms(forms.map(form => 
          form._id === formId ? { ...form, folderId } : form
        ));
        
        // Update folder form count
        setFolders(folders.map(folder => 
          folder._id === folderId 
            ? { ...folder, formCount: folder.formCount + 1 }
            : folder
        ));

        toast.success('Form moved to folder successfully');
      } catch (error: any) {
        console.error('Error moving form to folder:', error);
        toast.error('Failed to move form to folder');
      }
    }

    // If dropped on main area (remove from folder)
    if (destination.droppableId === 'main-area') {
      const form = forms.find(f => f._id === formId);
      
      if (form && form.folderId) {
        try {
          // Remove form from folder (set folderId to null)
          await formAPI.updateForm(formId, { ...form, folderId: null });
          
          // Update local state
          setForms(forms.map(f => 
            f._id === formId ? { ...f, folderId: undefined } : f
          ));

          // Update folder form count
          setFolders(folders.map(folder => 
            folder._id === form.folderId 
              ? { ...folder, formCount: Math.max(0, folder.formCount - 1) }
              : folder
          ));

          toast.success('Form moved out of folder');
        } catch (error: any) {
          console.error('Error moving form out of folder:', error);
          toast.error('Failed to move form');
        }
      }
    }
  };

  const handleLogout = () => {
    logout();
  };

  const standaloneForms = forms.filter(form => !form.folderId);
  const filteredStandaloneForms = standaloneForms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         form.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || form.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    folder.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFormsInFolder = (folderId: string) => {
    return forms.filter(form => form.folderId === folderId).filter(form => {
      const matchesSearch = form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           form.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || form.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  };

  const totalResponses = forms.reduce((sum, form) => sum + (form.responses || 0), 0);
  const totalViews = forms.reduce((sum, form) => sum + (form.views || 0), 0);
  const activeForms = forms.filter(form => form.status === 'published').length;

  const renderFileItem = (item: FormItem | FolderItem, type: 'form' | 'folder', index: number) => {
    const isFolder = type === 'folder';
    const isDragging = draggedItem === (isFolder ? `folder-${item._id}` : `form-${item._id}`);
    
    return (
      <div
        className={`group relative bg-white border border-transparent hover:border-blue-300 hover:bg-blue-50 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
          isDragging ? 'opacity-50 scale-95' : ''
        } ${selectedItems.has(item._id) ? 'border-blue-500 bg-blue-50' : ''}`}
        onClick={() => handleItemClick(item._id, type)}
        onDoubleClick={() => handleItemDoubleClick(item._id, type)}
        onContextMenu={!isFolder ? (e) => handleContextMenu(e, item as FormItem) : undefined}
      >
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Icon */}
          <div className="w-16 h-16 flex items-center justify-center">
            {isFolder ? (
              <div 
                className="w-14 h-14 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: (item as FolderItem).color + '20' }}
              >
                <Folder 
                  className="w-10 h-10" 
                  style={{ color: (item as FolderItem).color }}
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="w-full">
            <p className="text-sm font-medium text-gray-900 truncate">
              {isFolder ? (item as FolderItem).name : (item as FormItem).title}
            </p>
            {isFolder ? (
              <p className="text-xs text-gray-500">
                {(item as FolderItem).formCount} items
              </p>
            ) : (
              <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
                <span>{(item as FormItem).responses || 0} responses</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  (item as FormItem).status === 'published' ? 'bg-green-100 text-green-700' :
                  (item as FormItem).status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {(item as FormItem).status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Context Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Handle context menu
            }}
            className="p-1 bg-white rounded shadow-sm border border-gray-200 hover:bg-gray-50"
          >
            <MoreVertical className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>
    );
  };

  const renderContextMenu = () => {
    if (!contextMenu.show || !contextMenu.item) return null;

    const form = contextMenu.item;

    return (
      <div
        className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            onEditForm(form._id);
            setContextMenu({ show: false, x: 0, y: 0, item: null });
          }}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Edit className="w-4 h-4" />
          <span>Edit Form</span>
        </button>

        <button
          onClick={() => {
            onViewResponses(form._id);
            setContextMenu({ show: false, x: 0, y: 0, item: null });
          }}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          <span>View Responses</span>
        </button>

        {form.status === 'published' && form.shareUrl && (
          <button
            onClick={() => {
              copyShareLink(form.shareUrl!);
              setContextMenu({ show: false, x: 0, y: 0, item: null });
            }}
            className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Copy Share Link</span>
          </button>
        )}

        <button
          onClick={() => {
            duplicateForm(form);
            setContextMenu({ show: false, x: 0, y: 0, item: null });
          }}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Duplicate</span>
        </button>

        {form.status === 'published' && (
          <>
            <button
              onClick={() => {
                exportAPI.downloadExcel(form._id);
                toast.success('Excel download started');
                setContextMenu({ show: false, x: 0, y: 0, item: null });
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => {
                exportAPI.downloadCSV(form._id);
                toast.success('CSV download started');
                setContextMenu({ show: false, x: 0, y: 0, item: null });
              }}
              className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </>
        )}

        <div className="border-t border-gray-100 my-2"></div>

        <button
          onClick={() => {
            deleteForm(form._id);
            setContextMenu({ show: false, x: 0, y: 0, item: null });
          }}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    );
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Forms</h1>
                </div>
              </div>

              {/* Search Bar - Centered */}
              <div className="flex-1 max-w-2xl mx-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search forms and folders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  />
                </div>
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                      {getInitials()}
                    </div>
                  )}
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* Profile Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {user?.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                            {getInitials()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{user?.name}</p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick Stats</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{forms.length}</div>
                          <div className="text-xs text-gray-500">Total Forms</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{totalResponses}</div>
                          <div className="text-xs text-gray-500">Responses</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{totalViews}</div>
                          <div className="text-xs text-gray-500">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{activeForms}</div>
                          <div className="text-xs text-gray-500">Published</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
                        <BarChart3 className="w-4 h-4" />
                        <span>Analytics</span>
                      </button>
                      <button className="w-full flex items-center space-x-3 px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <div className="border-t border-gray-100 my-2"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSelectedFolder(null);
                  setShowFolderModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>
              
              <button
                onClick={onCreateForm}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Form</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>

              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <Droppable droppableId="main-area">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-96 ${
                  snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg' : ''
                }`}
              >
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {/* Folders */}
                    {filteredFolders.map((folder, index) => (
                      <Draggable key={`folder-${folder._id}`} draggableId={`folder-${folder._id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onDragStart={() => handleDragStart(`folder-${folder._id}`)}
                          >
                            {renderFileItem(folder, 'folder', index)}
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {/* Forms */}
                    {filteredStandaloneForms.map((form, index) => (
                      <Draggable key={`form-${form._id}`} draggableId={`form-${form._id}`} index={index + filteredFolders.length}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onDragStart={() => handleDragStart(`form-${form._id}`)}
                          >
                            {renderFileItem(form, 'form', index)}
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-sm font-medium text-gray-700">
                      <div>Name</div>
                      <div>Type</div>
                      <div>Status</div>
                      <div>Modified</div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {/* Folders in list view */}
                      {filteredFolders.map((folder, index) => (
                        <div key={folder._id} className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <Folder className="w-5 h-5" style={{ color: folder.color }} />
                            <span className="text-sm font-medium">{folder.name}</span>
                          </div>
                          <div className="text-sm text-gray-600">Folder</div>
                          <div className="text-sm text-gray-600">-</div>
                          <div className="text-sm text-gray-600">{new Date(folder.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                      
                      {/* Forms in list view */}
                      {filteredStandaloneForms.map((form, index) => (
                        <div key={form._id} className="grid grid-cols-4 gap-4 p-4 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium">{form.title}</span>
                          </div>
                          <div className="text-sm text-gray-600">Form</div>
                          <div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              form.status === 'published' ? 'bg-green-100 text-green-800' :
                              form.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {form.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{new Date(form.createdAt).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {provided.placeholder}

                {/* Empty State */}
                {filteredFolders.length === 0 && filteredStandaloneForms.length === 0 && (
                  <div className="text-center py-16">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {forms.length === 0 ? 'No forms created yet' : 'No forms or folders found'}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'Try adjusting your search or filter criteria'
                        : 'Get started by creating your first form'
                      }
                    </p>
                    {!searchTerm && filterStatus === 'all' && forms.length === 0 && (
                      <button
                        onClick={onCreateForm}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your First Form
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>

        {/* Click outside to close dropdown */}
        {showProfileDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowProfileDropdown(false)}
          />
        )}

        {/* Context Menu */}
        {renderContextMenu()}
        {/* Folder Modal */}
        <FolderModal
          isOpen={showFolderModal}
          onClose={() => {
            setShowFolderModal(false);
            setSelectedFolder(null);
          }}
          onSubmit={selectedFolder ? updateFolder : createFolder}
          title={selectedFolder ? 'Edit Folder' : 'Create New Folder'}
          initialData={selectedFolder ? {
            name: selectedFolder.name,
            description: selectedFolder.description,
            color: selectedFolder.color
          } : undefined}
        />

        {/* Folder Contents Modal */}
        {openFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gray-50 border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setOpenFolderModal(null)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: openFolderModal.color + '20' }}
                    >
                      <FolderOpen className="w-5 h-5" style={{ color: openFolderModal.color }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{openFolderModal.name}</h2>
                      <p className="text-sm text-gray-600">{getFormsInFolder(openFolderModal._id).length} items</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenFolderModal(null)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <Droppable droppableId={`folder-${openFolderModal._id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-64 ${
                        snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-4' : ''
                      }`}
                    >
                      {getFormsInFolder(openFolderModal._id).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {getFormsInFolder(openFolderModal._id).map((form, index) => (
                            <Draggable key={`form-${form._id}`} draggableId={`form-${form._id}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  {renderFileItem(form, 'form', index)}
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <Folder className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">This folder is empty</h3>
                          <p className="text-gray-600">Drag forms here to organize them</p>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default FormDashboard;