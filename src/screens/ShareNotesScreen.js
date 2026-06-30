/**
 * ShareNotesScreen.js
 * ─────────────────────────────────────────────
 * Official University Academic Study Repository.
 * Premium Phase 9.0 Design System Redesign.
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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ResponsiveContainer from '../components/ResponsiveContainer';

// Design System Tokens
import { SPACING, TYPOGRAPHY, RADIUS, SIZES, FONT_WEIGHTS } from '../theme';
import { getElevation } from '../theme/elevation';

const ShareNotesScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { 
    notes, notesLoading, notesHasMore, notesLoadingMore, loadMoreNotes, refreshData, posts,
    addNote, downloadNote, deleteNote,
    toggleLike, toggleSave, votePoll, userId 
  } = useData();

  const elevation = useMemo(() => getElevation(isDark), [isDark]);
  const styles = useMemo(() => createStyles(colors, elevation, isDark), [colors, elevation, isDark]);

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
          Alert.alert('Invalid Document', 'Only official academic PDF files can be uploaded.');
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
      Alert.alert('Error', 'Failed to select study document.');
    }
  };

  const handleUpload = useCallback(async () => {
    if (!noteTitle.trim() || !noteSubject.trim()) {
      Alert.alert('Missing Metadata', 'Please enter both document title and academic subject code.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('No Document Selected', 'Please select a PDF study guide to upload.');
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
      Alert.alert('Notes Published! 📚', 'Your study material is now accessible to peers across campus.');
    } catch (e) {
      console.error('[ShareNotes] Upload error:', e);
      Alert.alert(
        'Upload Failed', 
        e.message || 'An error occurred while publishing notes. Please try again.',
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
          Alert.alert('Error', 'Could not open study document URL.');
        });
      }
    } else {
      Alert.alert('Unavailable', 'No study document file exists for this record.');
    }
  }, [downloadNote]);

  const handleDeleteNote = useCallback((note) => {
    const performDeletion = async () => {
      setDeletingId(note.id);
      try {
        await deleteNote(note.id);
        showToast('Study document removed successfully', 'success');
      } catch (err) {
        console.error('[FLOW Error] handleDeleteNote error:', err);
        if (Platform.OS === 'web') {
          alert(err.message || 'Failed to remove note');
        } else {
          Alert.alert('Error', err.message || 'Failed to remove note');
        }
      } finally {
        setDeletingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to remove "${note.title}"?`);
      if (confirmed) {
        performDeletion();
      }
    } else {
      Alert.alert(
        'Remove Study Material',
        `Are you sure you want to permanently delete "${note.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
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
        <View style={styles.noteIconBox}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
        </View>
        
        <View style={styles.noteInfo}>
          <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.noteMetaRow}>
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{item.subject}</Text>
            </View>
            <Text style={styles.noteAuthor}>by {item.uploadedBy || 'Anonymous Student'}</Text>
          </View>

          <View style={styles.noteDetailsRow}>
            {fileSizeMb ? <Text style={styles.noteTime}>{fileSizeMb} MB</Text> : null}
            {fileSizeMb && formattedDate ? <Text style={styles.noteDot}>·</Text> : null}
            {formattedDate ? <Text style={styles.noteTime}>{formattedDate}</Text> : null}
            {(fileSizeMb || formattedDate) ? <Text style={styles.noteDot}>·</Text> : null}
            <View style={styles.downloadsWrap}>
              <Ionicons name="download-outline" size={13} color={colors.primary} />
              <Text style={styles.downloadsText}>{item.downloads || 0} downloads</Text>
            </View>
          </View>
        </View>

        <View style={styles.noteActions}>
          <Pressable 
            style={({ pressed }) => [styles.downloadBtn, pressed && { opacity: 0.8 }]} 
            onPress={() => handleDownload(item)}
          >
            <Ionicons name="eye-outline" size={16} color={colors.primary} />
            <Text style={styles.downloadBtnText}>View</Text>
          </Pressable>

          {(() => {
            const isAdmin = user && (user.role === 'admin' || user.isAdmin === true);
            const isOwner = userId && item.userId && String(userId) === String(item.userId);
            if (isAdmin || isOwner) {
              const isDeleting = deletingId === item.id;
              return (
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
                  onPress={() => handleDeleteNote(item)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  )}
                </Pressable>
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
      <SafeAreaView style={{ backgroundColor: colors.surface }} edges={['top']} />
      
      {/* Header Bar */}
      <View style={styles.appBar}>
        <Pressable onPress={handleGoBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.appBarTitle}>Academic Study Repository</Text>
        <Pressable 
          onPress={() => setShowUpload(!showUpload)} 
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name={showUpload ? 'close' : 'add'} size={24} color={colors.textOnPrimary} />
        </Pressable>
      </View>
      
      <ResponsiveContainer maxWidth={720} withCardStyle={false}>
        {/* Upload Form Card */}
        {showUpload && (
          <View style={styles.uploadCard}>
            <Text style={styles.uploadTitle}>Contribute PDF Study Guide</Text>
            <TextInput 
              style={styles.uploadInput} 
              placeholder="Document title (e.g. Data Structures Lecture 4)" 
              placeholderTextColor={colors.textDisabled} 
              value={noteTitle} 
              onChangeText={setNoteTitle} 
              editable={!posting}
            />
            <TextInput 
              style={styles.uploadInput} 
              placeholder="Course subject code (e.g. CS201)" 
              placeholderTextColor={colors.textDisabled} 
              value={noteSubject} 
              onChangeText={setNoteSubject} 
              autoCapitalize="characters" 
              editable={!posting}
            />

            <Pressable 
              style={({ pressed }) => [
                styles.pdfSelectBtn, 
                selectedFile && styles.pdfSelectBtnActive,
                pressed && { opacity: 0.85 }
              ]} 
              onPress={pickDocument} 
              disabled={posting}
            >
              <Ionicons 
                name="document-text-outline" 
                size={22} 
                color={selectedFile ? colors.primary : colors.textSecondary} 
              />
              <Text style={styles.pdfSelectText} numberOfLines={1}>
                {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` : 'Choose PDF Document File'}
              </Text>
              {selectedFile && !posting && (
                <Pressable onPress={() => setSelectedFile(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.danger} />
                </Pressable>
              )}
            </Pressable>

            {posting && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${uploadProgress}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={styles.progressText}>
                  Uploading study material: {uploadProgress}%
                </Text>
              </View>
            )}

            <Pressable 
              style={({ pressed }) => [
                styles.uploadBtn, 
                (posting || !selectedFile) && styles.uploadBtnDisabled,
                pressed && !(posting || !selectedFile) && { opacity: 0.85 }
              ]} 
              onPress={handleUpload} 
              disabled={posting || !selectedFile}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={colors.textOnPrimary} />
                  <Text style={styles.uploadBtnText}>Publish Study Guide</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search study titles, subjects, or student authors..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Subject Filters */}
        {uniqueSubjects.length > 1 && (
          <View style={styles.chipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScroll}
            >
              {uniqueSubjects.map((subj) => {
                const isActive = selectedSubject === subj;
                return (
                  <Pressable
                    key={subj}
                    style={({ pressed }) => [
                      styles.chipBtn,
                      isActive && styles.chipBtnActive,
                      pressed && { opacity: 0.8 }
                    ]}
                    onPress={() => setSelectedSubject(subj)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {subj}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
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
            onEndReached={() => {
              if (notesHasMore && !notesLoadingMore && !notesLoading) {
                loadMoreNotes();
              }
            }}
            onEndReachedThreshold={0.5}
            refreshing={notesLoading}
            onRefresh={refreshData}
            ListFooterComponent={
              notesLoadingMore ? (
                <View style={{ paddingVertical: SPACING.md, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="document-text-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() !== '' || selectedSubject !== 'All' ? 'No Matching Notes' : 'No Study Guides Yet'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery.trim() !== '' || selectedSubject !== 'All' 
                    ? 'Try adjusting your subject filters or broadening your search terms.'
                    : 'Be the first student to publish notes and help your peers master course material!'}
                </Text>
              </View>
            }
          />
        )}
      </ResponsiveContainer>
    </View>
  );
};

const createStyles = (colors, elevation, isDark) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 56,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  backBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  appBarTitle: {
    ...TYPOGRAPHY.title,
    color: colors.textPrimary,
  },
  addBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.xs,
  },
  uploadCard: {
    backgroundColor: colors.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.sm,
  },
  uploadTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  uploadInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: RADIUS.medium,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: SPACING.md,
    height: SIZES.layout.minTouchTarget + 6,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  pdfSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: RADIUS.medium,
    paddingHorizontal: SPACING.md,
    height: SIZES.layout.minTouchTarget + 6,
    marginBottom: SPACING.md,
    gap: 12,
  },
  pdfSelectBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  pdfSelectText: {
    flex: 1,
    ...TYPOGRAPHY.bodySmall,
    color: colors.textPrimary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  progressText: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: 6,
    textAlign: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.medium,
    height: SIZES.layout.minTouchTarget + 6,
    gap: 8,
    ...elevation.xs,
  },
  uploadBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  uploadBtnText: {
    ...TYPOGRAPHY.button,
    color: colors.textOnPrimary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.medium,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: SIZES.layout.minTouchTarget + 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: colors.textPrimary,
    paddingVertical: SPACING.sm,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  clearBtn: {
    padding: SPACING.xxs,
  },
  chipsWrap: {
    maxHeight: 48,
    marginBottom: SPACING.xs,
  },
  chipsScroll: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  chipTextActive: {
    color: colors.textOnPrimary,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: RADIUS.large,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.xs,
  },
  noteIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    ...TYPOGRAPHY.subtitle,
    color: colors.textPrimary,
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  subjectBadge: {
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnPrimary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  noteAuthor: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
  },
  noteDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  noteTime: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  noteDot: {
    ...TYPOGRAPHY.caption,
    color: colors.textMuted,
  },
  downloadsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadsText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: SPACING.sm,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  downloadBtnText: {
    ...TYPOGRAPHY.caption,
    color: colors.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  deleteBtn: {
    width: SIZES.layout.minTouchTarget,
    height: SIZES.layout.minTouchTarget,
    borderRadius: RADIUS.medium,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.massive,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xxs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default ShareNotesScreen;
