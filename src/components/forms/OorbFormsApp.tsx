import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import FormDashboard from './FormDashboard';
import EnhancedFormBuilder from './EnhancedFormBuilder';
import ResponseViewer from './ResponseViewer';
import FormCreationModal from './FormCreationModal';
import { formAPI } from '../../services/api';
import toast from 'react-hot-toast';

type View = 'dashboard' | 'builder' | 'responses';

const OorbFormsApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [showFormCreationModal, setShowFormCreationModal] = useState(false);

  const handleCreateForm = () => {
    setShowFormCreationModal(true);
  };

  const handleFormCreation = async (data: { title: string; description: string; folderId?: string }) => {
    try {
      console.log('Creating form with data:', data);
      
      const formData = {
        title: data.title,
        description: data.description,
        folderId: data.folderId || null,
        fields: [],
        status: 'draft'
      };
      
      const response = await formAPI.createForm(formData);
      console.log('Form created successfully:', response.data);
      
      setCurrentFormId(response.data._id);
      setCurrentView('builder');
      setShowFormCreationModal(false);
      toast.success('Form created successfully!');
    } catch (error: any) {
      console.error('Error creating form:', error);
      toast.error(error.response?.data?.error || 'Failed to create form');
    }
  };

  const handleEditForm = (formId: string) => {
    console.log('Editing form:', formId);
    setCurrentFormId(formId);
    setCurrentView('builder');
  };

  const handleViewResponses = (formId: string) => {
    console.log('Viewing responses for form:', formId);
    setCurrentFormId(formId);
    setCurrentView('responses');
  };

  const handleBackToDashboard = () => {
    console.log('Returning to dashboard');
    setCurrentView('dashboard');
    setCurrentFormId(null);
  };

  const renderCurrentView = () => {
    console.log('Rendering view:', currentView, 'with formId:', currentFormId);
    
    switch (currentView) {
      case 'dashboard':
        return (
          <FormDashboard 
            onCreateForm={handleCreateForm}
            onEditForm={handleEditForm}
            onViewResponses={handleViewResponses}
          />
        );
      
      case 'builder':
        return (
          <EnhancedFormBuilder 
            formId={currentFormId || undefined}
            onBack={handleBackToDashboard}
          />
        );
      
      case 'responses':
        return currentFormId ? (
          <ResponseViewer 
            formId={currentFormId}
            onBack={handleBackToDashboard}
          />
        ) : (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">No form selected for viewing responses</p>
              <button
                onClick={handleBackToDashboard}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <FormDashboard 
            onCreateForm={handleCreateForm}
            onEditForm={handleEditForm}
            onViewResponses={handleViewResponses}
          />
        );
    }
  };

  return (
    <>
      {renderCurrentView()}

      {/* Form Creation Modal */}
      <FormCreationModal
        isOpen={showFormCreationModal}
        onClose={() => setShowFormCreationModal(false)}
        onSubmit={handleFormCreation}
      />

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
};

export default OorbFormsApp;