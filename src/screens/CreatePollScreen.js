/**
 * CreatePollScreen – Firestore-Backed
 * ─────────────────────────────────────────────
 * Creates a poll via DataContext.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, GRADIENTS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import GradientButton from '../components/GradientButton';

const MAX_QUESTION_LENGTH = 150;
const MAX_OPTIONS = 6;

const CreatePollScreen = ({ navigation }) => {
  const { colors, shadows } = useTheme();
  const { addPost } = useData();
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows]);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);

  const CATEGORIES = [
    { id: 'General', icon: 'apps-outline', label: 'General' },
    { id: 'Academics', icon: 'school-outline', label: 'Academics' },
    { id: 'Events', icon: 'calendar-outline', label: 'Events' },
    { id: 'Social', icon: 'people-outline', label: 'Social' },
    { id: 'Polls', icon: 'bar-chart-outline', label: 'Polls' },
  ];

  const handleAddOption = () => {
    if (options.length < MAX_OPTIONS) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    } else {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_OPTIONS} options.`);
    }
  };

  const handleRemoveOption = (id) => {
    if (options.length > 2) {
      setOptions(options.filter(o => o.id !== id));
    } else {
      Alert.alert('Required', 'A poll must have at least 2 options.');
    }
  };

  const updateOptionText = (id, text) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      Alert.alert('Empty Question', 'Please enter a question for your poll.');
      return;
    }
    const validOptions = options.filter(o => o.text.trim());
    if (validOptions.length < 2) {
      Alert.alert('Missing Options', 'Please provide at least 2 options.');
      return;
    }

    setLoading(true);
    try {
      const pollData = {
        options: validOptions.map(o => ({ text: o.text.trim(), votes: 0 })),
        votedBy: [],
      };
      
      // We pass the question as the content, and attach the poll data
      await addPost(question.trim(), { 
        poll: pollData,
        title: 'New Community Poll',
        category: category 
      });
      
      Alert.alert('Poll Created! 📊', 'Your poll is now live.', [
        { text: 'OK', onPress: () => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Main');
        }},
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to create poll. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={{ backgroundColor: '#1E3A8A' }} edges={['top']} />
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={['#1E3A8A', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Main');
          }} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Create Poll</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.card}>
          <Text style={styles.label}>Poll Question</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textArea}
              placeholder="Ask your community..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={MAX_QUESTION_LENGTH}
              value={question}
              onChangeText={setQuestion}
              textAlignVertical="top"
            />
          </View>

          {/* Category Selector */}
          <Text style={styles.label}>Select Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={cat.icon} 
                    size={16} 
                    color={isActive ? '#FFFFFF' : colors.textSecondary} 
                  />
                  <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.optionsContainer}>
            <Text style={styles.label}>Options</Text>
            {options.map((opt, index) => (
              <View key={opt.id} style={styles.optionRow}>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    style={styles.optionInput}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.textTertiary}
                    value={opt.text}
                    onChangeText={(txt) => updateOptionText(opt.id, txt)}
                    maxLength={60}
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemoveOption(opt.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>
            ))}

            {options.length < MAX_OPTIONS && (
              <TouchableOpacity style={styles.addOptionBtn} onPress={handleAddOption} activeOpacity={0.7}>
                <View style={styles.addIconCircle}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.addOptionText}>Add Another Option</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <GradientButton
          title={loading ? 'Creating…' : 'Post Poll'}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginHorizontal: SIZES.md, marginTop: SIZES.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors, shadows) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  appBarContainer: { ...shadows.medium, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, paddingBottom: SIZES.md, paddingTop: SIZES.sm + (Platform.OS === 'ios' ? 40 : 20),
  },
  closeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  scroll: { flexGrow: 1, paddingBottom: SIZES.xxxl },
  card: { 
    backgroundColor: colors.surface, borderRadius: 24, marginHorizontal: SIZES.md, 
    padding: SIZES.lg, borderWidth: 1, borderColor: colors.borderLight, ...shadows.medium,
    marginTop: SIZES.md,
  },
  label: { fontSize: 13, fontWeight: '900', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: SIZES.md },
  questionInput: { 
    backgroundColor: colors.surfaceLight, borderRadius: 16, borderWidth: 1, borderColor: colors.borderLight, 
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.md, fontSize: 16, color: colors.textPrimary, 
    minHeight: 100, textAlignVertical: 'top', marginBottom: SIZES.lg,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) 
  },
  categoryScroll: { marginHorizontal: -SIZES.lg, marginBottom: SIZES.lg },
  categoryContent: { paddingHorizontal: SIZES.lg, gap: 10, paddingVertical: 4 },
  categoryChip: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, 
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 6,
    borderWidth: 1, borderColor: colors.borderLight
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  categoryLabelActive: { color: '#FFFFFF' },
  removeBtn: { 
    width: 44, height: 44, borderRadius: 12, 
    backgroundColor: colors.accent + '10', 
    alignItems: 'center', justifyContent: 'center' 
  },
  addOptionBtn: { 
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', 
    marginTop: SIZES.sm, paddingVertical: SIZES.sm, paddingHorizontal: SIZES.lg, 
    borderRadius: 16, backgroundColor: colors.primaryLight,
    borderWidth: 1, borderColor: colors.primary + '30',
  },
  addIconCircle: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  addOptionText: { fontSize: 14, fontWeight: '800', color: colors.primary },
});

export default CreatePollScreen;
