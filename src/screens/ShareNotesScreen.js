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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AnimatedPostCard from '../components/AnimatedPostCard';
import ResponsiveContainer from '../components/ResponsiveContainer';

const ShareNotesScreen = ({ navigation }) => {
  const { colors, shadows, isDark } = useTheme();
  const { 
    notes, notesLoading, posts,
    addNote, downloadNote, 
    toggleLike, toggleSave, votePoll, userId 
  } = useData();
  const styles = useMemo(() => createStyles(colors, shadows, isDark), [colors, shadows, isDark]);

  const handleLike = useCallback((postId) => toggleLike(postId), [toggleLike]);
  const handleSave = useCallback((postId) => toggleSave(postId), [toggleSave]);

  // Unified Feed: Notes + Categorized Posts
  const mergedData = useMemo(() => {
    const notePosts = posts
      .filter(p => p.category === 'Notes' || p.category === 'Share Notes')
      .map(p => ({ ...p, isGenericPost: true }));
    
    const nativeNotes = notes.map(n => ({ ...n, isGenericPost: false }));

    return [...nativeNotes, ...notePosts].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : 0;
      const dateB = b.createdAt ? new Date(b.createdAt) : 0;
      return dateB - dateA;
    });
  }, [notes, posts]);

  const [showUpload, setShowUpload] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSubject, setNoteSubject] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newAttachments = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.fileName || `Image_${Date.now()}.jpg`,
        type: 'image',
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
    });

    if (!result.canceled) {
      const newAttachments = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.name,
        type: 'document',
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) {
      setShowLinkInput(false);
      return;
    }
    const url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      Alert.alert('Invalid Link', 'Please enter a valid URL starting with http:// or https://');
      return;
    }
    setAttachments(prev => [...prev, { uri: url, name: url, type: 'link' }]);
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const handleUpload = useCallback(async () => {
    if (!noteTitle.trim() || !noteSubject.trim()) {
      Alert.alert('Missing Info', 'Please enter both title and subject.');
      return;
    }
    setPosting(true);
    try {
      await addNote(noteTitle.trim(), noteSubject.trim().toUpperCase(), attachments);
      setNoteTitle('');
      setNoteSubject('');
      setAttachments([]);
      setShowUpload(false);
      Alert.alert('Uploaded! 📚', 'Your notes are now available for the community.');
    } catch (e) {
      Alert.alert('Error', 'Failed to upload notes.');
    } finally {
      setPosting(false);
    }
  }, [noteTitle, noteSubject, addNote, attachments]);

  const handleDownload = useCallback((note) => {
    downloadNote(note.id);
    Alert.alert('Downloaded! ✅', `"${note.title}" saved to your device.`);
  }, [downloadNote]);

  const renderItem = Array.prototype.map.call([noteTitle], () => null)[0] || useCallback(({ item, index }) => {
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

    return (
      <View style={styles.noteCard}>
        <View style={styles.noteIcon}><Ionicons name="document-text" size={22} color={colors.accentCyan} /></View>
        <View style={styles.noteInfo}>
          <Text style={styles.noteTitle}>{item.title}</Text>
          <View style={styles.noteMeta}>
            <View style={styles.subjectBadge}><Text style={styles.subjectText}>{item.subject}</Text></View>
            <Text style={styles.noteAuthor}>by {item.author}</Text>
            {item.attachments?.length > 0 && (
              <>
                <Text style={styles.noteDot}>·</Text>
                <View style={styles.attachmentBadge}>
                  <Ionicons name="attach" size={12} color={colors.primary} />
                  <Text style={styles.attachmentText}>{item.attachments.length}</Text>
                </View>
              </>
            )}
            <Text style={styles.noteDot}>·</Text>
            <Text style={styles.noteTime}>{item.time || ''}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownload(item)} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={18} color={colors.primary} />
          <Text style={styles.downloadCount}>{item.downloads || 0}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [styles, colors, handleDownload, handleLike, handleSave, votePoll, userId, navigation]);

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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
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
          <Text style={styles.uploadTitle}>Upload Notes</Text>
          <TextInput style={styles.uploadInput} placeholder="Note title (e.g. Linked Lists)" placeholderTextColor={colors.textTertiary} value={noteTitle} onChangeText={setNoteTitle} />
          <TextInput style={styles.uploadInput} placeholder="Subject code (e.g. CS201)" placeholderTextColor={colors.textTertiary} value={noteSubject} onChangeText={setNoteSubject} autoCapitalize="characters" />

          <View style={styles.attachmentActions}>
            <TouchableOpacity style={styles.attachmentBtn} onPress={pickImage} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={20} color={colors.primary} />
              <Text style={styles.attachmentBtnText}>Add Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentBtn} onPress={pickDocument} activeOpacity={0.7}>
              <Ionicons name="document-outline" size={20} color={colors.primary} />
              <Text style={styles.attachmentBtnText}>Add Docs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachmentBtn} onPress={() => setShowLinkInput(true)} activeOpacity={0.7}>
              <Ionicons name="link-outline" size={20} color={colors.primary} />
              <Text style={styles.attachmentBtnText}>Add Link</Text>
            </TouchableOpacity>
          </View>

          {showLinkInput && (
            <View style={styles.linkInputRow}>
              <TextInput 
                style={styles.linkInput} 
                placeholder="https://google.com/drive/..." 
                placeholderTextColor={colors.textTertiary} 
                value={linkUrl} 
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity style={styles.linkDoneBtn} onPress={handleAddLink}>
                <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          )}

          {attachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachmentPreviewScroll}>
              {attachments.map((file, idx) => (
                <View key={idx} style={styles.attachmentPreviewCard}>
                  <Ionicons 
                    name={file.type === 'image' ? 'image' : file.type === 'link' ? 'link' : 'document'} 
                    size={16} 
                    color={colors.textSecondary} 
                  />
                  <Text style={styles.attachmentName} numberOfLines={1}>{file.name}</Text>
                  <TouchableOpacity onPress={() => removeAttachment(idx)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={16} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          <TouchableOpacity style={[styles.uploadBtn, posting && { opacity: 0.7 }]} onPress={handleUpload} activeOpacity={0.8} disabled={posting}>
            {posting ? <ActivityIndicator size="small" color={colors.textOnPrimary} /> : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color={colors.textOnPrimary} />
                <Text style={styles.uploadBtnText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {notesLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={mergedData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No notes yet 📝</Text>
              <Text style={styles.emptySubtitle}>Be the first to share study resources with your peers!</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>
    </View>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
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
  downloadBtn: {
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceLight,
    borderWidth: 1, borderColor: colors.borderLight,
  },
  downloadCount: { fontSize: 10, color: colors.primary, fontWeight: '900', marginTop: 2 },

  attachmentActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  attachmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  attachmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  linkInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SIZES.md,
  },
  linkInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: colors.textPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  linkDoneBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPreviewScroll: {
    marginBottom: SIZES.md,
  },
  attachmentPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    marginRight: 10,
    maxWidth: 150,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  attachmentName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    marginRight: 4,
    maxWidth: 80,
  },
  removeBtn: {
    padding: 2,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  attachmentText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
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
