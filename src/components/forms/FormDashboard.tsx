import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Share2,
  BarChart3,
  Users,
  Calendar,
  FileText,
  Download,
  Send,
  Folder,
  FolderOpen,
  FolderPlus,
  Settings,
  Menu,
  Bot,
  Image as ImageIcon,
  Star,
  User,
  LogOut,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
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

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;

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

    // If dropped on standalone area
    if (destination.droppableId === 'standalone-forms') {
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

          toast.success('Form moved to standalone area');
        } catch (error: any) {
          console.error('Error moving form to standalone:', error);
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

  const renderFormCard = (form: FormItem, index: number, isDragging = false) => (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer group ${
        isDragging ? 'shadow-lg rotate-2' : ''
      }`}
      onClick={() => onEditForm(form._id)}
    >
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="font-medium text-gray-900 text-sm mb-2 truncate w-full">
          {form.title}
        </h3>
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
          <span>{form.responses || 0} responses</span>
          <span>•</span>
          <span>{form.views || 0} views</span>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          form.status === 'published' ? 'bg-green-100 text-green-800' :
          form.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {form.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewResponses(form._id);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="View responses"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          {form.status === 'published' && form.shareUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyShareLink(form.shareUrl!);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Copy share link"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteForm(form._id);
          }}
          className="p-1 text-gray-400 hover:text-red-600 rounded"
          title="Delete form"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

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

        <div className="px-6 py-8">
          {/* Create Form Options */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
              {/* Blank Form */}
              <div 
                onClick={onCreateForm}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-24 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center group-hover:border-blue-500 transition-colors relative">
                    <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <FileText className="w-10 h-10 text-gray-400 group-hover:text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Blank Form</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Start with a blank form and add your own questions
                    </p>
                  </div>
                </div>
              </div>

              {/* Create by AI */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-24 bg-purple-50 rounded-lg border-2 border-purple-200 flex items-center justify-center group-hover:border-purple-500 transition-colors relative">
                    <div className="absolute top-2 left-2 w-2 h-2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Bot className="w-10 h-10 text-purple-400 group-hover:text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Create by AI</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Let AI help you create a form based on your description
                    </p>
                  </div>
                </div>
              </div>

              {/* Use Template */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-24 bg-green-50 rounded-lg border-2 border-green-200 flex items-center justify-center group-hover:border-green-500 transition-colors relative">
                    <div className="absolute top-2 left-2 w-2 h-2 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <ImageIcon className="w-10 h-10 text-green-400 group-hover:text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Use Template</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Choose from pre-built templates for common use cases
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Your Forms Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-gray-900">Your Forms</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setSelectedFolder(null);
                    setShowFolderModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </button>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Forms and Folders */}
            <div className="space-y-6">
              {/* Folders */}
              {filteredFolders.map((folder) => {
                const folderForms = getFormsInFolder(folder._id);
                const isExpanded = expandedFolders.has(folder._id);
                
                return (
                  <div key={folder._id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Folder Header */}
                    <Droppable droppableId={`folder-${folder._id}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-4 border-b border-gray-100 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleFolder(folder._id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: folder.color + '20' }}
                              >
                                {isExpanded ? (
                                  <FolderOpen className="w-5 h-5" style={{ color: folder.color }} />
                                ) : (
                                  <Folder className="w-5 h-5" style={{ color: folder.color }} />
                                )}
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{folder.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {folderForms.length} forms
                                  {snapshot.isDraggingOver && (
                                    <span className="text-blue-600 ml-2">• Drop here to add form</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFolder(folder);
                                  setShowFolderModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteFolder(folder._id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Folder Contents */}
                    {isExpanded && (
                      <div className="p-4">
                        {folderForms.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {folderForms.map((form, index) => (
                              <Draggable key={form._id} draggableId={`form-${form._id}`} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    {renderFormCard(form, index, snapshot.isDragging)}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No forms in this folder</p>
                            <p className="text-sm">Drag forms here to organize them</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Standalone Forms */}
              {filteredStandaloneForms.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">Standalone Forms</h3>
                    <p className="text-sm text-gray-500">{filteredStandaloneForms.length} forms</p>
                  </div>
                  <div className="p-4">
                    <Droppable droppableId="standalone-forms">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${
                            snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-4 border-2 border-dashed border-blue-300' : ''
                          }`}
                        >
                          {filteredStandaloneForms.map((form, index) => (
                            <Draggable key={form._id} draggableId={`form-${form._id}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  {renderFormCard(form, index, snapshot.isDragging)}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              )}
            </div>

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
        </div>

        {/* Click outside to close dropdown */}
        {showProfileDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowProfileDropdown(false)}
          />
        )}

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
      </div>
    </DragDropContext>
  );
};

export default FormDashboard;