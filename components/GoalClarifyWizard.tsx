import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator
} from 'react-native';
import { X, ChevronRight, ChevronLeft, Target } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';

interface GoalContext {
  outcome: string;
  unit: string;
  milestones: string[];
  dailyMinutes: number;
  proofPrefs: 'photo' | 'audio' | 'either';
  constraints: string;
}

interface GoalClarifyWizardProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: (context: GoalContext) => void;
  goalTitle: string;
}

const QUESTIONS = [
  {
    id: 'outcome',
    title: 'What measurable outcome defines success?',
    placeholder: 'e.g., +10 kg muscle, publish 300-page novel, save $5000',
    type: 'text' as const
  },
  {
    id: 'milestones',
    title: 'Name up to 3 key milestones you care about',
    placeholder: 'e.g., First 5kg gained, Complete first draft, Save $1000',
    type: 'list' as const
  },
  {
    id: 'dailyMinutes',
    title: 'How many focused minutes can you spend on this goal each day?',
    placeholder: '30',
    type: 'number' as const
  },
  {
    id: 'proofPrefs',
    title: 'How do you prefer to provide proof of progress?',
    placeholder: '',
    type: 'choice' as const,
    choices: [
      { value: 'photo', label: 'Photo evidence' },
      { value: 'audio', label: 'Audio recordings' },
      { value: 'either', label: 'Either photo or audio' }
    ]
  },
  {
    id: 'constraints',
    title: 'Any constraints or limitations?',
    placeholder: 'e.g., Rest days on weekends, No gym equipment, Budget limit $100',
    type: 'text' as const
  }
];

export default function GoalClarifyWizard({
  visible,
  onDismiss,
  onComplete,
  goalTitle
}: GoalClarifyWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<GoalContext>>({});
  const [loading, setLoading] = useState(false);

  const currentQuestion = QUESTIONS[currentStep];
  const isLastStep = currentStep === QUESTIONS.length - 1;
  const canProceed = answers[currentQuestion.id as keyof GoalContext] !== undefined &&
    answers[currentQuestion.id as keyof GoalContext] !== '';

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // Parse outcome to extract number and unit
      const outcome = answers.outcome || '';
      const numberMatch = outcome.match(/([+-]?\d+(?:\.\d+)?)/); 
      const number = numberMatch ? parseFloat(numberMatch[1]) : 0;
      
      // Extract unit (everything after the number)
      const unit = outcome.replace(/[+-]?\d+(?:\.\d+)?\s*/, '').trim() || 'units';
      
      // Parse milestones
      const milestonesText = answers.milestones || '';
      const milestones = (typeof milestonesText === 'string' ? milestonesText : milestonesText.join(','))
        .split(/[,\n]/) 
        .map((m: string) => m.trim())
        .filter((m: string) => m.length > 0)
        .slice(0, 3);

      const context: GoalContext = {
        outcome: number.toString(),
        unit,
        milestones,
        dailyMinutes: answers.dailyMinutes || 30,
        proofPrefs: answers.proofPrefs || 'either',
        constraints: answers.constraints || ''
      };

      onComplete(context);
    } catch (error) {
      console.error('Error completing goal clarification:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = () => {
    const question = currentQuestion;
    const currentValue = answers[question.id as keyof GoalContext];

    switch (question.type) {
      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={currentValue as string || ''}
            onChangeText={(text) => handleAnswer(text)}
            placeholder={question.placeholder}
            placeholderTextColor={Colors.dark.subtext}
            multiline={question.id === 'constraints'}
            numberOfLines={question.id === 'constraints' ? 3 : 1}
          />
        );

      case 'list':
        return (
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={currentValue as string || ''}
            onChangeText={(text) => handleAnswer(text)}
            placeholder={question.placeholder}
            placeholderTextColor={Colors.dark.subtext}
            multiline
            numberOfLines={4}
          />
        );

      case 'number':
        return (
          <TextInput
            style={styles.textInput}
            value={currentValue?.toString() || ''}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              handleAnswer(num);
            }}
            placeholder={question.placeholder}
            placeholderTextColor={Colors.dark.subtext}
            keyboardType="numeric"
          />
        );

      case 'choice':
        return (
          <View style={styles.choicesContainer}>
            {question.choices?.map((choice) => (
              <TouchableOpacity
                key={choice.value}
                style={[
                  styles.choiceButton,
                  currentValue === choice.value && styles.choiceButtonSelected
                ]}
                onPress={() => handleAnswer(choice.value)}
              >
                <Text style={[
                  styles.choiceText,
                  currentValue === choice.value && styles.choiceTextSelected
                ]}>
                  {choice.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Target size={24} color={Colors.dark.primary} />
            <Text style={styles.headerTitle}>Goal Clarification</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
            <X size={24} color={Colors.dark.subtext} />
          </TouchableOpacity>
        </View>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Step {currentStep + 1} of {QUESTIONS.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.goalTitle}>Goal: {goalTitle}</Text>
          
          <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
          
          {renderQuestion()}
          
          {currentQuestion.id === 'outcome' && (
            <Text style={styles.hint}>
              💡 Be specific with numbers and units for better task generation
            </Text>
          )}
          
          {currentQuestion.id === 'dailyMinutes' && (
            <Text style={styles.hint}>
              💡 Hustle will use this to create realistic daily tasks that fit your schedule
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <Button
                title="Back"
                onPress={handleBack}
                variant="outline"
                icon={<ChevronLeft size={16} color={Colors.dark.primary} />}
                style={styles.navButton}
              />
            )}
            
            <Button
              title={isLastStep ? 'Generate Tasks' : 'Next'}
              onPress={handleNext}
              disabled={!canProceed || loading}
              loading={loading && isLastStep}
              icon={!isLastStep ? <ChevronRight size={16} color={Colors.dark.text} /> : undefined}
              style={[styles.navButton, { flex: 1 }]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.separator,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.dark.separator,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.dark.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 16,
    lineHeight: 28,
  },
  textInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.dark.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.separator,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  choicesContainer: {
    marginBottom: 16,
  },
  choiceButton: {
    backgroundColor: Colors.dark.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.separator,
  },
  choiceButtonSelected: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    borderColor: Colors.dark.primary,
  },
  choiceText: {
    fontSize: 16,
    color: Colors.dark.text,
  },
  choiceTextSelected: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: Colors.dark.subtext,
    fontStyle: 'italic',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.separator,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    minWidth: 100,
  },
});