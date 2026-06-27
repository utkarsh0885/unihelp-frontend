/**
 * ShareNotesScreen – Persistent + Theme-Aware
 * ─────────────────────────────────────────────
 * Upload and browse shared notes.
 * Uses DataContext for persistent data.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ResponsiveContainer from '../components/ResponsiveContainer';

const ShareNotesScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const { 
    notes, notesLoading, posts,
    addNote, downloadNote, deleteNote,
    toggleLike, toggleSave, votePoll, userId 
  } = useData();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const handleGoBack = () => {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('Main');
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      window.history.back();
    }
  };

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);

  // Unified Feed: Notes + Categorized Posts
  const mergedData = useMemo(() => {
    const notePosts = posts
      .filter(p => p.category === 'Notes' || p.category === 'Share Notes')
      .map(p => ({ ...p, isGenericPost: true }));
    
    const nativeNotes = notes.map(n => ({ ...n, isGenericPost: false }));

    return [...nativeNotes, ...notePosts].sort((a, b) => {
      const dateA = a.uploadedAt 
        ? new Date(a.uploadedAt?.seconds * 1000 || a.uploadedAt) 
        : a.createdAt 
          ? new Date(a.createdAt?.seconds * 1000 || a.createdAt) 
          : 0;
      const dateB = b.uploadedAt 
        ? new Date(b.uploadedAt?.seconds * 1000 || b.uploadedAt) 
        : b.createdAt 
          ? new Date(b.createdAt?.seconds * 1000 || b.createdAt) 
          : 0;
      return dateB - dateA;
    });
  }, [notes, posts]);

  // Extract unique subjects from unfiltered mergedData
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set();
    mergedData.forEach(item => {
      if (item.subject) {
        subjects.add(item.subject.trim().toUpperCase());
      }
    });
    return ['All', ...Array.from(subjects).sort()];
  }, [mergedData]);

  // Filter notes locally on subject and search query
  const filteredData = useMemo(() => {
    return mergedData.filter(item => {
      const matchesSubject = selectedSubject === 'All' || 
        (item.subject && item.subject.toUpperCase() === selectedSubject.toUpperCase());

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesSubject;

      const title = (item.title || '').toLowerCase();
      const subject = (item.subject || '').toLowerCase();
      const uploader = (item.uploader || item.uploadedBy || item.author || item.authorName || '').toLowerCase();

      const matchesSearch = title.includes(query) || 
        subject.includes(query) || 
        uploader.includes(query);

      return matchesSubject && matchesSearch;
    });
  }, [mergedData, selectedSubject, searchQuery]);

  const [showUpload, setShowUpload] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const isPdf = asset.mimeType === 'application/pdf' || asset.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          Alert.alert('Invalid File', 'Only PDF files can be uploaded.');
          return;
        }
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
        });
      }
    } catch (e) {
      console.warn('[ShareNotes] DocumentPicker error:', e);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleUpload = useCallback(async () => {
    if (!noteTitle.trim() || !noteSubject.trim()) {
      Alert.alert('Missing Info', 'Please enter both title and subject.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a PDF file to upload.');
      return;
    }
    setPosting(true);
    setUploadProgress(0);
    try {
      await addNote(
        noteTitle.trim(),
        noteSubject.trim().toUpperCase(),
        selectedFile.uri,
        selectedFile.name,
        selectedFile.size || 0,
        (progress) => {
          setUploadProgress(Math.round(progress));
        }
      );
      setNoteTitle('');
      setNoteSubject('');
      setSelectedFile(null);
      setShowUpload(false);
      Alert.alert('Uploaded! 📚', 'Your notes are now available for the community.');
    } catch (e) {
      console.error('[ShareNotes] Upload error:', e);
      Alert.alert(
        'Upload Failed', 
        e.message || 'An error occurred during note upload. Please try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleUpload() }
        ]
      );
    } finally {
      setPosting(false);
      setUploadProgress(0);
    }
  }, [noteTitle, noteSubject, selectedFile, addNote]);

  const handleDownload = useCallback((note) => {
    if (note.fileUrl) {
      downloadNote(note.id);
      if (Platform.OS === 'web') {
        window.open(note.fileUrl, '_blank');
      } else {
        Linking.openURL(note.fileUrl).catch(err => {
          Alert.alert('Error', 'Could not open PDF URL.');
        });
      }
    } else {
      Alert.alert('Unavailable', 'No file URL exists for this note.');
    }
  }, [downloadNote]);

  const handleDeleteNote = useCallback((note) => {
    console.log('[FLOW 2] handleDeleteNote entered | note.id:', note?.id, '| typeof deleteNote:', typeof deleteNote);

    const performDeletion = async () => {
      setDeletingId(note.id);
      try {
        console.log('[FLOW 4] Calling deleteNote()');
        await deleteNote(note.id);
        showToast('Note deleted successfully', 'success');
      } catch (err) {
        console.error('[FLOW Error] handleDeleteNote error:', err);
        if (Platform.OS === 'web') {
          alert(err.message || 'Failed to delete note');
        } else {
          Alert.alert('Error', err.message || 'Failed to delete note');
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete "${note.title}"?`);
      if (confirmed) {
        console.log('[FLOW 3] window.confirm returned true');
        performDeletion();
      }
    } else {
      Alert.alert(
        'Delete Note',
        `Are you sure you want to delete "${note.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              console.log('[FLOW 3] Alert Delete button pressed');
              await performDeletion();
            },
          },
        ]
      );
    }
  }, [deleteNote, showToast]);

  const renderItem = useCallback(({ item, index }) => {
    if (item.isGenericPost) {
      return (
        <AnimatedPostCard
          post={item}
          onPress={(p) => navigation.navigate('PostDetail', { post: p })}
          onLike={handleLike}
          onSave={handleSave}
          onComment={(p) => navigation.navigate('PostDetail', { post: p })}
          onVotePoll={votePoll}
          userId={userId}
          index={index}
        />
      );
    }

    const fileSizeMb = item.fileSize ? (item.fileSize / 1024 / 1024).toFixed(2) : null;
    const formattedDate = item.uploadedAt 
      ? new Date(item.uploadedAt?.seconds * 1000 || item.uploadedAt).toLocaleDateString()
      : item.createdAt 
        ? new Date(item.createdAt?.seconds * 1000 || item.createdAt).toLocaleDateString() 
        : '';

    return (
      <View style={styles.noteCard}>
        <View style={styles.noteIcon}>
          <Ionicons name="document-text" size={22} color={colors.accentCyan} />
        </View>
        <View style={styles.noteInfo}>
          <Text style={styles.noteTitle}>{item.title}</Text>
          <View style={styles.noteMeta}>
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{item.subject}</Text>
            </View>
            <Text style={styles.noteAuthor}>by {item.uploadedBy || 'Anonymous'}</Text>
            {fileSizeMb && (
              <>
                <Text style={styles.noteDot}>·</Text>
                <Text style={styles.noteTime}>{fileSizeMb} MB</Text>
              </>
            )}
            {formattedDate ? (
              <>
                <Text style={styles.noteDot}>·</Text>
                <Text style={styles.noteTime}>{formattedDate}</Text>
              </>
            ) : null}
          </View>
        </View>
        <View style={styles.noteActions}>
          <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(item)} activeOpacity={0.7}>
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text style={styles.downloadCount}>View</Text>
          </TouchableOpacity>
          {(() => {
            const isAdmin = user && (user.role === 'admin' || user.isAdmin === true);
            const isOwner = userId && item.userId && String(userId) === String(item.userId);
            if (isAdmin || isOwner) {
              const isDeleting = deletingId === item.id;
              return (
                <TouchableOpacity
                  style={styles.deleteNoteBtn}
                  onPress={() => {
                    console.log('[FLOW 1] Trash button pressed');
                    handleDeleteNote(item);
                  }}
                  activeOpacity={0.7}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  )}
                </TouchableOpacity>
              );
            }
            return null;
          })()}
        </View>
      </View>
    );
  }, [styles, colors, handleDownload, handleDeleteNote, handleLike, handleSave, votePoll, userId, user, deletingId, navigation]);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={{ backgroundColor: '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Share Notes</Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => setShowUpload(!showUpload)}>
            <Ionicons name={showUpload ? 'close' : 'add'} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>
      </View>
      
      <ResponsiveContainer maxWidth={700} withCardStyle={false}>
      {showUpload && (
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>Upload PDF Notes</Text>
          <TextInput 
            style={[styles.uploadInput, { color: colors.textPrimary }]} 
            placeholder="Note title (e.g. Linked Lists)" 
            placeholderTextColor={colors.textTertiary} 
            value={noteTitle} 
            onChangeText={setNoteTitle} 
            editable={!posting}
          />
          <TextInput 
            style={[styles.uploadInput, { color: colors.textPrimary }]} 
            placeholder="Subject code (e.g. CS201)" 
            placeholderTextColor={colors.textTertiary} 
            value={noteSubject} 
            onChangeText={setNoteSubject} 
            autoCapitalize="characters" 
            editable={!posting}
          />

          <TouchableOpacity 
            style={[styles.pdfSelectBtn, selectedFile && styles.pdfSelectBtnActive]} 
            onPress={pickDocument} 
            disabled={posting} 
            activeOpacity={0.7}
          >
            <Ionicons 
              name="document-text-outline" 
              size={20} 
              color={selectedFile ? colors.accentCyan : colors.primary} 
            />
            <Text style={[styles.pdfSelectText, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Choose PDF File'}
            </Text>
            {selectedFile && !posting && (
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={18} color={colors.accent} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {posting && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: colors.accentCyan }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                Uploading: {uploadProgress}%
              </Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.uploadBtn, (posting || !selectedFile) && { opacity: 0.7 }]} 
            onPress={handleUpload} 
            activeOpacity={0.8} 
            disabled={posting || !selectedFile}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#000" />
                <Text style={styles.uploadBtnText}>Upload PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Premium Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search title, subject, or uploader..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontally Scrollable Subject Chips */}
      {uniqueSubjects.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContainer}
          style={styles.chipsScrollView}
        >
          {uniqueSubjects.map((subj) => {
            const isActive = selectedSubject === subj;
            return (
              <TouchableOpacity
                key={subj}
                style={[
                  styles.chipBtn,
                  isActive ? styles.chipBtnActive : null
                ]}
                onPress={() => setSelectedSubject(subj)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive ? styles.chipTextActive : { color: colors.textSecondary }
                  ]}
                >
                  {subj}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {notesLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() !== '' || selectedSubject !== 'All' ? 'No matches found 🔍' : 'No notes yet 📝'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery.trim() !== '' || selectedSubject !== 'All' 
                  ? 'Try broadening your search query or choosing another subject filter.'
                  : 'Be the first to share PDF study resources with your peers!'}
              </Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    marginBottom: SIZES.sm,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.small,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  clearSearchBtn: {
    padding: 4,
  },
  chipsScrollView: {
    maxHeight: 50,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.xs,
  },
  chipsScrollContainer: {
    paddingHorizontal: 2,
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  list: { padding: SIZES.md, paddingBottom: SIZES.xxxl },
  uploadCard: {
    margin: SIZES.md, backgroundColor: colors.surface, borderRadius: 24,
    padding: SIZES.lg, borderWidth: 1, borderColor: colors.border, ...shadows.large
  },
  uploadTitle: { fontSize: 13, fontWeight: '900', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: SIZES.md },
  uploadInput: {
    backgroundColor: colors.surfaceLight, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: SIZES.md, height: 50, fontSize: 16, color: colors.textPrimary, marginBottom: SIZES.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accentCyan, borderRadius: 14, paddingVertical: 14,
    gap: 8, marginTop: SIZES.xs, ...shadows.glow
  },
  uploadBtnText: { color: '#000', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: SIZES.md,
    marginBottom: SIZES.sm + 2, borderWidth: 1, borderColor: colors.borderLight,
    ...shadows.small,
  },
  noteIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentCyan + '15',
    alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md
  },
  noteInfo: { flex: 1 },
  noteTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  noteMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 },
  subjectBadge: { backgroundColor: colors.primaryGlow, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  subjectText: { fontSize: 10, fontWeight: '900', color: colors.primary },
  noteAuthor: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },
  noteDot: { fontSize: 12, color: colors.textTertiary },
  noteTime: { fontSize: 12, color: colors.textTertiary },
  noteActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  downloadBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 60, height: 44, borderRadius: 12, backgroundColor: colors.surfaceLight,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  downloadCount: { fontSize: 11, color: colors.primary, fontWeight: '900', marginTop: 2 },
  deleteNoteBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EF444415',
    borderWidth: 1, borderColor: '#EF444430',
  },

  pdfSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: SIZES.sm,
    gap: 12,
  },
  pdfSelectBtnActive: {
    borderColor: colors.accentCyan,
    backgroundColor: colors.accentCyan + '10',
  },
  pdfSelectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: SIZES.md,
    marginTop: SIZES.xs,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty State Styles
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.xxxl,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ShareNotesScreen;
