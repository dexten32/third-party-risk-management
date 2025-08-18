import prisma from "../prisma/client.js";
import { cacheKeys } from "../utils/cacheKeys.js";
import { setLastUpdated } from "../utils/cacheManager.js";

export const getQuestionnaires = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const questionnaires = await prisma.questionnaire.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      message: "Questionnaires fetched successfully.",
      data: questionnaires.map((q) => ({
        id: q.id,
        question: q.question,
        answerType: q.answerType,
        fileUrl: q.fileUrl,
        comment: q.comment,
      })),
    });
  } catch (err) {
    console.error("Error fetching questionnaires:", err);
    res.status(500).json({ error: "Failed to fetch questionnaires" });
  }
};

export const getQuestionnaireStats = async (req, res) => {
  try {
    let vendorId;

    if (req.user.role === 'VENDOR') {
      vendorId = req.user.id;
    } else if (req.user.role === 'CLIENT' || req.user.role === 'COMPANY') {
      vendorId = req.query.vendorId;
      if (!vendorId) return res.status(400).json({ error: 'vendorId is required' });
    }

    const vendor = await prisma.user.findUnique({
      where: { id: vendorId },
      include: { questionnaire: true },
    });

    if (!vendor || vendor.role !== 'VENDOR') {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const totalQuestions = vendor.questionnaire.length;
    const answered = vendor.questionnaire.filter(
      (q) => q.answerType && (q.fileUrl || q.comment)
    ).length;

    res.json({
      success: true,
      data: {
        vendorId,
        totalQuestions,
        answered,
        completionPercent:
          totalQuestions === 0 ? 0 : Math.round((answered / totalQuestions) * 100),
      },
    });
  } catch (err) {
    console.error('Error in getQuestionnaireStats:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ✅ Submit or update questionnaire
export const submitQuestionnaire = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { questionKey, answerType, comment } = req.body;

    if (!questionKey || !answerType) {
      return res.status(400).json({ message: "questionKey and answerType are required." });
    }

    let fileKey = null;
    if (answerType === "YES_FILE") {
      if (!req.file) return res.status(400).json({ message: "File is required for YES_FILE answers." });
      fileKey = req.file.key;
    }

    if (answerType === "NO_COMMENT" && !comment?.trim()) {
      return res.status(400).json({ message: "Comment is required for NO_COMMENT answers." });
    }

    const existing = await prisma.questionnaire.findFirst({ where: { vendorId, questionKey } });

    const data = {
      answerType,
      fileUrl: fileKey,
      comment: answerType === "NO_COMMENT" ? comment : null,
    };

    let saved;
    if (existing) {
      saved = await prisma.questionnaire.update({ where: { id: existing.id }, data });
    } else {
      saved = await prisma.questionnaire.create({ data: { vendorId, questionKey, ...data } });
    }

    // ✅ Cache invalidation
    await Promise.all([
      setLastUpdated(cacheKeys.vendorQuestionnaire(vendorId)),
      setLastUpdated(cacheKeys.clientQuestionnaireStatus(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForVendor(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForCompany(vendorId)),
    ]);

    return res.status(200).json({
      message: existing ? "Questionnaire answer updated successfully." : "Questionnaire answer created successfully.",
      data: {
        id: saved.id,
        questionKey: saved.questionKey,
        answerType: saved.answerType,
        fileUrl: saved.fileUrl,
        comment: saved.comment,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    console.error("Submit Questionnaire Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const updateQuestionnaire = async (req, res) => {
  const { id } = req.params;
  const { questionKey, answerType, fileUrl, comment } = req.body;
  const vendorId = req.user.id;

  try {
    const existing = await prisma.questionnaire.findUnique({ where: { id } });

    if (!existing || existing.vendorId !== vendorId) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const updated = await prisma.questionnaire.update({ where: { id }, data: { questionKey, answerType, fileUrl, comment } });

    // ✅ Cache invalidation
    await Promise.all([
      setLastUpdated(cacheKeys.vendorQuestionnaire(vendorId)),
      setLastUpdated(cacheKeys.clientQuestionnaireStatus(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForVendor(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForCompany(vendorId)),
    ]);

    res.status(200).json({
      message: "Questionnaire updated.",
      data: {
        id: updated.id,
        questionKey: updated.questionKey,
        answerType: updated.answerType,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: "Failed to update questionnaire." });
  }
};

export const deleteQuestionnaire = async (req, res) => {
  const { id } = req.params;
  const vendorId = req.user.id;

  try {
    const existing = await prisma.questionnaire.findUnique({ where: { id } });

    if (!existing || existing.vendorId !== vendorId) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    await prisma.questionnaire.delete({ where: { id } });

    // ✅ Cache invalidation
    await Promise.all([
      setLastUpdated(cacheKeys.vendorQuestionnaire(vendorId)),
      setLastUpdated(cacheKeys.clientQuestionnaireStatus(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForVendor(vendorId)),
      setLastUpdated(cacheKeys.vendorSummaryForCompany(vendorId)),
    ]);

    res.status(200).json({
      message: "Questionnaire deleted successfully.",
      data: { id },
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete questionnaire." });
  }
};
