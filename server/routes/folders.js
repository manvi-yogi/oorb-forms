import express from 'express';
import Folder from '../models/Folder.js';
import Form from '../models/Form.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all folders for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Folders route - Getting folders for user:', req.user._id);
    
    const folders = await Folder.find({ createdBy: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email');
    
    // Update form count for each folder
    for (let folder of folders) {
      const formCount = await Form.countDocuments({ 
        folderId: folder._id,
        createdBy: req.user._id 
      });
      if (folder.formCount !== formCount) {
        folder.formCount = formCount;
        await folder.save();
      }
    }
    
    console.log('Folders route - Found', folders.length, 'folders');
    res.json(folders);
  } catch (error) {
    console.error('Folders route - Error getting folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get folder by ID with forms (only if user owns it)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Folders route - Getting folder by ID:', req.params.id, 'for user:', req.user._id);
    
    const folder = await Folder.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    }).populate('createdBy', 'name email');
    
    if (!folder) {
      console.log('Folders route - Folder not found or access denied');
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    const forms = await Form.find({ 
      folderId: req.params.id,
      createdBy: req.user._id 
    }).sort({ updatedAt: -1 });
    
    console.log('Folders route - Folder found with', forms.length, 'forms');
    res.json({
      folder,
      forms
    });
  } catch (error) {
    console.error('Folders route - Error getting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new folder
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Folders route - Creating folder for user:', req.user._id, 'with data:', req.body);
    
    const folderData = {
      ...req.body,
      createdBy: req.user._id
    };
    
    const folder = new Folder(folderData);
    await folder.save();
    
    const populatedFolder = await Folder.findById(folder._id).populate('createdBy', 'name email');
    console.log('Folders route - Folder created successfully:', populatedFolder._id);
    
    res.status(201).json(populatedFolder);
  } catch (error) {
    console.error('Folders route - Error creating folder:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update folder (only if user owns it)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Folders route - Updating folder:', req.params.id, 'for user:', req.user._id);
    
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!folder) {
      console.log('Folders route - Folder not found or access denied for update');
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    console.log('Folders route - Folder updated successfully');
    res.json(folder);
  } catch (error) {
    console.error('Folders route - Error updating folder:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete folder (only if user owns it)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Folders route - Deleting folder:', req.params.id, 'for user:', req.user._id);
    
    const folder = await Folder.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!folder) {
      console.log('Folders route - Folder not found or access denied for deletion');
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    // Check if folder has forms
    const formCount = await Form.countDocuments({ 
      folderId: req.params.id,
      createdBy: req.user._id 
    });
    
    if (formCount > 0) {
      console.log('Folders route - Cannot delete folder with forms');
      return res.status(400).json({ 
        error: 'Cannot delete folder with forms. Please move or delete all forms first.' 
      });
    }
    
    await Folder.findByIdAndDelete(req.params.id);
    console.log('Folders route - Folder deleted successfully');
    
    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Folders route - Error deleting folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move forms to folder (only if user owns both folder and forms)
router.post('/:id/move-forms', authenticateToken, async (req, res) => {
  try {
    console.log('Folders route - Moving forms to folder:', req.params.id, 'for user:', req.user._id);
    
    const { formIds } = req.body;
    
    const folder = await Folder.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!folder) {
      console.log('Folders route - Folder not found or access denied for moving forms');
      return res.status(404).json({ error: 'Folder not found or access denied' });
    }
    
    // Only update forms that belong to the user
    const result = await Form.updateMany(
      { 
        _id: { $in: formIds },
        createdBy: req.user._id 
      },
      { folderId: req.params.id, updatedAt: new Date() }
    );
    
    // Update folder form count
    folder.formCount = await Form.countDocuments({ 
      folderId: req.params.id,
      createdBy: req.user._id 
    });
    await folder.save();
    
    console.log('Folders route - Forms moved successfully, updated', result.modifiedCount, 'forms');
    res.json({ message: 'Forms moved successfully' });
  } catch (error) {
    console.error('Folders route - Error moving forms:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;