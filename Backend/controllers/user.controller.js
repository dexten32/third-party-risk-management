// controllers/company.controller.js
import { VerificationStatus } from '@prisma/client';
import prisma from '../prisma/client.js';
import { cacheKeys } from '../utils/cacheKeys.js';
import { setLastUpdated } from '../utils/cacheManager.js';

export const getVendorDetailsById = async (req, res) => {
  const { vendorId } = req.params;

  try {
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: {
        name: true,
        verificationStatus: true,
        email: true,
        questionnaireStatus: true,
        client: {
          select: { name: true }
        }
      }
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    return res.json({
      vendorName: vendor.name,
      clientName: vendor.client?.name || 'N/A',
      verificationStatus: vendor.verificationStatus || 'PENDING',
      vendorEmail: vendor.email || 'N/A',
      vendorQuestionnaireStatus: vendor.questionnaireStatus || 'PENDING'
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Upload / update summary with cache invalidation
export const uploadSummary = async (req, res) => {
  const { vendorId, parsedContent } = req.body;

  if (!vendorId || !parsedContent) {
    return res.status(400).json({ success: false, message: 'Missing vendorId or content' });
  }

  try {
    const vendor = await prisma.user.findUnique({ where: { id: vendorId, role: 'VENDOR' } });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    const summary = await prisma.summary.upsert({
      where: { vendorId },
      update: { parsedContent },
      create: { vendorId, parsedContent, createdAt: new Date() },
    });

    // ✅ Invalidate relevant cache keys
    await Promise.all([
      setLastUpdated(cacheKeys.vendorSummaryForVendor(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForCompany(vendorId)),
      setLastUpdated(cacheKeys.vendorSummary(vendorId)),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Summary uploaded successfully',
      data: summary,
    });
  } catch (err) {
    console.error('Error uploading summary:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ✅ Delete user with cache invalidation
export const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.delete({ where: { id: userId } });

    // ✅ Invalidate caches for this user if vendor
    if (user.role === 'VENDOR') {
      await Promise.all([
        setLastUpdated(cacheKeys.vendorQuestionnaire(userId)),
        setLastUpdated(cacheKeys.vendorSummaryForVendor(userId)),
        setLastUpdated(cacheKeys.vendorSummaryForCompany(userId)),
      ]);
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLoggedInVendorDetails = async (req, res) => {
  const vendorId = req.user.id;

  try {
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      select: {
        name: true,
        email: true,
        role: true,
        questionnaireStatus: true,
        client: { select: { name: true } }
      }
    });

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    return res.json({
      vendorName: vendor.name,
      clientName: vendor.client?.name || 'N/A',
      vendorEmail: vendor.email,
      vendorRole: vendor.role,
      vendorQuestionnaireStatus: vendor.questionnaireStatus || 'PENDING'
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
