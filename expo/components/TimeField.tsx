import React, { useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Colors from '@/constants/colors';

export default function TimeField({ 
  label, 
  value, 
  onChange 
}: {
  label: string;
  value: string; // "HH:MM"
  onChange: (hhmm: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(() => {
    const d = new Date();
    const [h, m] = value.split(':').map(Number);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  });

  function toHHMM(d: Date) {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (selectedDate) {
      setTemp(selectedDate);
      onChange(toHHMM(selectedDate));
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.box} onPress={() => setOpen(true)}>
        <Text style={styles.val}>{value}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          mode="time"
          value={temp}
          display={Platform.select({ ios: 'spinner', android: 'clock' })}
          onChange={handleChange}
          style={styles.picker}
        />
      )}
      {Platform.OS === 'ios' && open && (
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { 
    marginTop: 8 
  },
  label: { 
    color: Colors.dark.subtext, 
    fontSize: 13, 
    marginBottom: 6 
  },
  box: { 
    backgroundColor: Colors.dark.background, 
    borderRadius: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.dark.separator,
  },
  val: { 
    color: Colors.dark.primary, 
    fontSize: 16, 
    fontWeight: '600', 
    letterSpacing: 0.2 
  },
  picker: { 
    backgroundColor: Colors.dark.background,
    marginTop: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});