import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  Type, 
  CheckSquare, 
  Circle, 
  Calendar, 
  Mail, 
  Phone, 
  FileText, 
  Upload, 
  Star,
  Plus,
  Trash2,
  Settings,
  Eye,
  Save,
  Share2,
  ArrowLeft,
  Send,
  BarChart3
} from 'lucide-react';
import { formAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'rating';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface Form {
  _id?: string;
  title: string;
  description: string;
  fields: FormField[];
  status: 'draft' | 'published' | 'closed';
  shareUrl?: string;
}

interface FormBuilderProps {
  formId?: string;
  onBack: () => void;
  onViewResponses?: (formId: string) => void;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ formId, onBack, onViewResponses }) => {
  const [form, setForm] = useState<Form>({
    title: 'Untitled Form',
    description: 'Form description',
    fields: [],
    status: 'draft'
  });
  
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fieldTypes = [
    { type: 'text', label: 'Text Input', icon: Type },
    { type: 'email', label: 'Email', icon: Mail },
    { type: 'phone', label: 'Phone', icon: Phone },
    { type: 'textarea', label: 'Long Answer', icon: FileText },
    { type: 'select', label: 'Dropdown', icon: CheckSquare },
    { type: 'radio', label: 'Multiple Choice', icon: Circle },
    { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
    { type: 'date', label: 'Date', icon: Calendar },
    { type: 'file', label: 'File Upload', icon: Upload },
    { type: 'rating', label: 'Rating', icon: Star }
  ];

  // Load form if editing
  useEffect(() => {
    if (formId) {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      const response = await formAPI.getForm(formId!);
      setForm(response.data);
    } catch (error) {
      toast.error('Failed to load form');
      console.error('Error loading form:', error);
    }
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `${fieldTypes.find(ft => ft.type === type)?.label} Field`,
      placeholder: type === 'textarea' ? 'Enter your answer here...' : 'Enter your answer',
      required: false,
      options: ['radio', 'checkbox', 'select'].includes(type) ? ['Option 1', 'Option 2'] : undefined
    };
    
    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const deleteField = (fieldId: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
    setSelectedField(null);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(form.fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setForm(prev => ({ ...prev, fields: items }));
  };

  const saveForm = async () => {
    if (!form.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    setSaving(true);
    try {
      if (form._id) {
        await formAPI.updateForm(form._id, form);
        toast.success('Form saved successfully');
      } else {
        const response = await formAPI.createForm(form);
        setForm(response.data);
        toast.success('Form created successfully');
      }
    } catch (error) {
      toast.error('Failed to save form');
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };

  const publishForm = async () => {
    if (!form._id) {
      toast.error('Please save the form first');
      return;
    }

    if (form.fields.length === 0) {
      toast.error('Please add at least one field');
      return;
    }

    setPublishing(true);
    try {
      const response = await formAPI.publishForm(form._id);
      setForm(response.data);
      toast.success('Form published successfully!');
    } catch (error) {
      toast.error('Failed to publish form');
      console.error('Error publishing form:', error);
    } finally {
      setPublishing(false);
    }
  };

  const copyShareLink = () => {
    if (form.shareUrl) {
      const shareLink = `${window.location.origin}/form/${form.shareUrl}`;
      navigator.clipboard.writeText(shareLink);
      toast.success('Share link copied to clipboard!');
    }
  };

  const renderFieldPreview = (field: FormField) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent";
    
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className={baseClasses}
            disabled={!previewMode}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            rows={4}
            className={baseClasses}
            disabled={!previewMode}
          />
        );
      
      case 'select':
        return (
          <select className={baseClasses} disabled={!previewMode}>
            <option value="">Choose an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'radio':
        return (
          <div className="space-y-2 ">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input type="radio" name={field.id} value={option} disabled={!previewMode} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input type="checkbox" value={option} disabled={!previewMode} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'date':
        return (
          <input
            type="date"
            className={baseClasses}
            disabled={!previewMode}
          />
        );
      
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center ">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Click to upload or drag and drop</p>
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-6 h-6 text-gray-300 hover:text-yellow-400 cursor-pointer" />
            ))}
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderFieldEditor = () => {
    const field = form.fields.find(f => f.id === selectedField);
    if (!field) return null;

    return (
      <div className="bg-white border-l border-gray-200 p-6 w-80 ">
        <h3 className="text-lg font-semibold mb-4">Field Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Label
            </label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(field.id, { label: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {['text', 'email', 'phone', 'textarea'].includes(field.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder || ''}
                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
          
          {['radio', 'checkbox', 'select'].includes(field.type) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options
              </label>
              <div className="space-y-2">
                {field.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[index] = e.target.value;
                        updateField(field.id, { options: newOptions });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        const newOptions = field.options?.filter((_, i) => i !== index);
                        updateField(field.id, { options: newOptions });
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                    updateField(field.id, { options: newOptions });
                  }}
                  className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                >
                  + Add Option
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="required"
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="required" className="text-sm font-medium text-gray-700">
              Required field
            </label>
          </div>
          
          <button
            onClick={() => deleteField(field.id)}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete Field
          </button>
        </div>
      </div>
    );
  };

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Form Preview</h1>
            <button
              onClick={() => setPreviewMode(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Editor
            </button>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
              <p className="text-gray-600">{form.description}</p>
            </div>
            
            <form className="space-y-6">
              {form.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderFieldPreview(field)}
                </div>
              ))}
              
              <button
                type="submit"
                className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Field Types */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        <h2 className="text-lg font-semibold mb-4">Add Fields</h2>
        <div className="space-y-2">
          {fieldTypes.map((fieldType) => {
            const Icon = fieldType.icon;
            return (
              <button
                key={fieldType.type}
                onClick={() => addField(fieldType.type as FormField['type'])}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 rounded-md transition-colors"
              >
                <Icon className="w-5 h-5 text-gray-600" />
                <span className="text-sm">{fieldType.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              />
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                form.status === 'published' ? 'bg-green-100 text-green-800' :
                form.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {form.status}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode(true)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
              <button 
                onClick={saveForm}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button 
                onClick={publishForm}
                disabled={publishing || !form._id}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{publishing ? 'Publishing...' : 'Publish'}</span>
              </button>
              {form.status === 'published' && form.shareUrl && (
                <button
                  onClick={copyShareLink}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              )}
              {form._id && onViewResponses && (
                <button
                  onClick={() => onViewResponses(form._id!)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Responses</span>
                </button>
              )}
              {form._id && (
                <button
                  onClick={() => window.open(`/oorb-forms/responses/${form._id}`, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View Responses</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Form Builder */}
          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <div className="mb-8">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full"
                    placeholder="Form Title"
                  />
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full mt-2 resize-none"
                    placeholder="Form description"
                    rows={2}
                  />
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="form-fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {form.fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`border rounded-lg p-4 bg-white transition-all ${
                                  selectedField === field.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                                } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                                onClick={() => setSelectedField(field.id)}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div {...provided.dragHandleProps} className="cursor-move p-1 hover:bg-gray-100 rounded">
                                    <div className="flex space-x-1">
                                      <div className="w-1 h-4 bg-gray-400 rounded"></div>
                                      <div className="w-1 h-4 bg-gray-400 rounded"></div>
                                      <div className="w-1 h-4 bg-gray-400 rounded"></div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                      {field.type}
                                    </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedField(field.id);
                                    }}
                                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </label>
                                  {renderFieldPreview(field)}
                                </div>
                                
                                {/* Drag indicator */}
                                {snapshot.isDragging && (
                                  <div className="absolute inset-0 bg-blue-100 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center">
                                    <span className="text-blue-600 font-medium">Moving field...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        
                        {form.fields.length === 0 && (
                          <div className="text-center py-12 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No fields added yet</p>
                            <p className="text-sm">Add fields from the sidebar to get started</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </div>

          {/* Field Editor */}
          {selectedField && renderFieldEditor()}
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;