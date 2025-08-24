import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';

export default function PreparingOverlay({ visible, subtitle = 'Hustle is preparing your plan…' }:{
  visible: boolean; subtitle?: string;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ActivityIndicator size="large" />
          <Text style={styles.title}>Welcome to the Grind</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', alignItems:'center', justifyContent:'center' },
  card: { width:'82%', borderRadius:16, padding:20, backgroundColor:'#111' },
  title: { color:'#fff', fontSize:18, fontWeight:'600', marginTop:8 },
  sub: { color:'#c9c9c9', fontSize:14, marginTop:6 }
});