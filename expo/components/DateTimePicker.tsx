import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Platform,
  TouchableWithoutFeedback
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';
import Button from './Button';

type DateTimePickerModalProps = {
  visible: boolean;
  initialDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
};

export default function DateTimePickerModal({
  visible,
  initialDate,
  onClose,
  onConfirm,
  mode = 'date',
  minimumDate,
  maximumDate,
  title = 'Select Date'
}: DateTimePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(visible && Platform.OS === 'android');

  const handleChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
      if (event.type === 'set' && date) {
        setSelectedDate(date);
        // On Android, we confirm immediately after selection
        if (mode !== 'datetime') {
          onConfirm(date);
        }
      } else {
        onClose();
      }
    } else if (date) {
      setSelectedDate(date);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  // For Android, we show the native picker directly
  if (Platform.OS === 'android') {
    return showAndroidPicker ? (
      <DateTimePicker
        value={selectedDate}
        mode={mode === 'datetime' ? 'date' : mode}
        display="default"
        onChange={handleChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    ) : mode === 'datetime' ? (
      <DateTimePicker
        value={selectedDate}
        mode="time"
        display="default"
        onChange={(event, date) => {
          if (event.type === 'set' && date) {
            const combinedDate = new Date(selectedDate);
            combinedDate.setHours(date.getHours());
            combinedDate.setMinutes(date.getMinutes());
            onConfirm(combinedDate);
          } else {
            onClose();
          }
        }}
      />
    ) : null;
  }

  // For iOS, we show a modal with the picker
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={selectedDate}
                mode={mode === 'datetime' ? 'date' : mode}
                display="spinner"
                onChange={(_, date) => date && setSelectedDate(date)}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                style={styles.picker}
              />
              
              {mode === 'datetime' && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="spinner"
                  onChange={(_, date) => {
                    if (date) {
                      const newDate = new Date(selectedDate);
                      newDate.setHours(date.getHours());
                      newDate.setMinutes(date.getMinutes());
                      setSelectedDate(newDate);
                    }
                  }}
                  style={styles.picker}
                />
              )}
              
              <Button
                title="Confirm"
                onPress={handleConfirm}
                style={styles.confirmButton}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.dark.primary,
  },
  picker: {
    width: '100%',
  },
  confirmButton: {
    marginTop: 16,
  },
});