// Firestore Service - Handles all database operations for query history
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebaseConfig";

const HISTORY_COLLECTION = "query_history";

/**
 * Save a query and its response to Firestore
 */
export async function saveQueryHistory(userId, data) {
  try {
    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), {
      userId,
      question: data.question || "",
      reply: data.reply || "",
      language: data.language || "en",
      replyLanguage: data.replyLanguage || "en",
      inputType: data.inputType || "text",
      hasImage: data.hasImage || false,
      imageUrl: data.imageUrl || null,
      timestamp: serverTimestamp(),
      model: data.model || null,
      source: data.source || null
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving query to Firestore:", error);
    throw error;
  }
}

/**
 * Get all queries for a specific user
 */
export async function getQueryHistory(userId, limit = 100) {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where("userId", "==", userId),
      orderBy("timestamp", "desc")
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
      });
    });

    return history.slice(0, limit);
  } catch (error) {
    console.error("Error fetching query history:", error);
    throw error;
  }
}

/**
 * Search query history by keywords
 */
export async function searchQueryHistory(userId, searchTerm) {
  try {
    const allHistory = await getQueryHistory(userId, 1000);
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allHistory.filter(
      (item) =>
        item.question?.toLowerCase().includes(lowerSearchTerm) ||
        item.reply?.toLowerCase().includes(lowerSearchTerm)
    );
  } catch (error) {
    console.error("Error searching history:", error);
    throw error;
  }
}

/**
 * Delete a specific history entry
 */
export async function deleteHistoryEntry(historyId) {
  try {
    await deleteDoc(doc(db, HISTORY_COLLECTION, historyId));
  } catch (error) {
    console.error("Error deleting history entry:", error);
    throw error;
  }
}

/**
 * Get query statistics for a user
 */
export async function getQueryStats(userId) {
  try {
    const q = query(
      collection(db, HISTORY_COLLECTION),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    const totalQueries = querySnapshot.size;

    let tamiQueries = 0;
    let englishQueries = 0;
    let imageQueries = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.language === "ta") tamiQueries++;
      else if (data.language === "en") englishQueries++;
      if (data.hasImage) imageQueries++;
    });

    return {
      totalQueries,
      tamiQueries,
      englishQueries,
      imageQueries
    };
  } catch (error) {
    console.error("Error getting query stats:", error);
    throw error;
  }
}
