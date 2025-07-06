import express from 'express';
import Form from '../models/Form.js';
import Response from '../models/Response.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all forms for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Getting forms for user:', req.user._id);
    
    const { limit, sort } = req.query;
    let query = Form.find({ createdBy: req.user._id });
    
    if (sort) {
      query = query.sort({ [sort]: -1 });
    } else {
      query = query.sort({ updatedAt: -1 });
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const forms = await query.populate('createdBy', 'name email');
    console.log('Forms route - Found', forms.length, 'forms');
    
    res.json(forms);
  } catch (error) {
    console.error('Forms route - Error getting forms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get form by ID (only if user owns it)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Getting form by ID:', req.params.id, 'for user:', req.user._id);
    
    const form = await Form.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    }).populate('createdBy', 'name email');
    
    if (!form) {
      console.log('Forms route - Form not found or access denied');
      return res.status(404).json({ error: 'Form not found or access denied' });
    }
    
    console.log('Forms route - Form found:', form.title);
    res.json(form);
  } catch (error) {
    console.error('Forms route - Error getting form:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get form by share URL (public - no authentication needed)
router.get('/share/:shareUrl', async (req, res) => {
  try {
    console.log('Forms route - Getting form by share URL:', req.params.shareUrl);
    
    const form = await Form.findOne({ shareUrl: req.params.shareUrl });
    if (!form) {
      console.log('Forms route - Form not found for share URL');
      return res.status(404).json({ error: 'Form not found' });
    }
    
    // Increment view count
    form.views += 1;
    await form.save();
    
    console.log('Forms route - Public form found:', form.title);
    res.json(form);
  } catch (error) {
    console.error('Forms route - Error getting form by share URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new form
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Creating form for user:', req.user._id, 'with data:', req.body);
    
    const formData = {
      ...req.body,
      createdBy: req.user._id
    };
    
    const form = new Form(formData);
    await form.save();
    
    const populatedForm = await Form.findById(form._id).populate('createdBy', 'name email');
    console.log('Forms route - Form created successfully:', populatedForm._id);
    
    res.status(201).json(populatedForm);
  } catch (error) {
    console.error('Forms route - Error creating form:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update form (only if user owns it)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Updating form:', req.params.id, 'for user:', req.user._id);
    
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');
    
    if (!form) {
      console.log('Forms route - Form not found or access denied for update');
      return res.status(404).json({ error: 'Form not found or access denied' });
    }
    
    console.log('Forms route - Form updated successfully');
    res.json(form);
  } catch (error) {
    console.error('Forms route - Error updating form:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete form (only if user owns it)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Deleting form:', req.params.id, 'for user:', req.user._id);
    
    const form = await Form.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      console.log('Forms route - Form not found or access denied for deletion');
      return res.status(404).json({ error: 'Form not found or access denied' });
    }
    
    // Also delete all responses for this form
    await Response.deleteMany({ formId: req.params.id });
    
    console.log('Forms route - Form deleted successfully');
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Forms route - Error deleting form:', error);
    res.status(500).json({ error: error.message });
  }
});

// Publish form (only if user owns it)
router.post('/:id/publish', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Publishing form:', req.params.id, 'for user:', req.user._id);
    
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status: 'published', updatedAt: new Date() },
      { new: true }
    ).populate('createdBy', 'name email');
    
    if (!form) {
      console.log('Forms route - Form not found or access denied for publishing');
      return res.status(404).json({ error: 'Form not found or access denied' });
    }
    
    console.log('Forms route - Form published successfully');
    res.json(form);
  } catch (error) {
    console.error('Forms route - Error publishing form:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get form analytics (only if user owns it)
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    console.log('Forms route - Getting analytics for form:', req.params.id, 'for user:', req.user._id);
    
    const form = await Form.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      console.log('Forms route - Form not found or access denied for analytics');
      return res.status(404).json({ error: 'Form not found or access denied' });
    }

    const responses = await Response.find({ formId: req.params.id });
    
    // Calculate analytics
    const totalResponses = responses.length;
    const completionRate = form.views > 0 ? (totalResponses / form.views) * 100 : 0;
    
    // Response trends (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentResponses = responses.filter(r => r.submittedAt >= last7Days);
    
    const analytics = {
      totalViews: form.views,
      totalResponses,
      completionRate: Math.round(completionRate * 100) / 100,
      recentResponses: recentResponses.length,
      averageCompletionTime: responses.reduce((acc, r) => acc + (r.completionTime || 0), 0) / totalResponses || 0
    };

    console.log('Forms route - Analytics calculated successfully');
    res.json(analytics);
  } catch (error) {
    console.error('Forms route - Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;