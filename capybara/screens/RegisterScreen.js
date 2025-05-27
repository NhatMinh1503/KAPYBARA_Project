import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import styles from '../scripts/RegisterStyles';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: '女',
    height: '',
    weight: '',
    goal: '体重を落としたい',
    steps: '',
    goalWeight: '',
    health: '',
  });

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value });
  };

  const handleHealthSelect = (status) => {
    setForm({ ...form, health: status });
  };

  const handleSubmit = () => {
    Alert.alert('登録しました！');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>App name にようこそ！</Text>

        <Text style={styles.label}>名前</Text>
        <TextInput
          style={styles.input}
          placeholder="ヘルスくん"
          value={form.name}
          onChangeText={(text) => handleChange('name', text)}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>年齢</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.age}
                onChangeText={(text) => handleChange('age', text)}
              />
              <Text style={styles.inlineText}>歳</Text>
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>性別</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={form.gender}
                onValueChange={(value) => handleChange('gender', value)}
              >
                <Picker.Item label="女" value="女" />
                <Picker.Item label="男" value="男" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>身長</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.height}
                onChangeText={(text) => handleChange('height', text)}
              />
              <Text style={styles.inlineText}>cm</Text>
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>今の体重</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.weight}
                onChangeText={(text) => handleChange('weight', text)}
              />
              <Text style={styles.inlineText}>kg</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>目標</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={form.goal}
            onValueChange={(value) => handleChange('goal', value)}
          >
            <Picker.Item label="体重を落としたい" value="体重を落としたい" />
            <Picker.Item label="体重を増やしたい" value="体重を増やしたい" />
          </Picker>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>目標歩数</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.steps}
                onChangeText={(text) => handleChange('steps', text)}
              />
              <Text style={styles.inlineText}>歩</Text>
            </View>
          </View>

          <View style={styles.half}>
            <Text style={styles.label}>目標体重</Text>
            <View style={styles.inlineInput}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={form.goalWeight}
                onChangeText={(text) => handleChange('goalWeight', text)}
              />
              <Text style={styles.inlineText}>kg</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>今の健康状態</Text>
        <View style={styles.healthOptions}>
          {['元気', '疲れ', '病気'].map((status) => (
            <TouchableOpacity
              key={status}
              style={styles.healthIcon}
              onPress={() => handleHealthSelect(status)}
            >
              <Image
                source={{ uri: `https://placehold.co/60x60?text=${status}` }}
                style={[
                  styles.healthImage,
                  form.health === status && styles.healthImageSelected
                ]}
              />
              <Text>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>登録</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
