import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f6fc',
    alignItems: 'center',
    
  },
  form: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#f9f4fd',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#444',
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginTop: 6,
    flex: 1,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  inlineInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
  },
  healthOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  healthIcon: {
    alignItems: 'center',
  },
  healthImage: {
    width: 60,
    height: 60,
    backgroundColor: '#eee',
    borderRadius: 10,
  },
  healthImageSelected: {
    borderWidth: 2,
    borderColor: '#6aa2ff',
  },
  button: {
    marginTop: 24,
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 10,
  },
  buttonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
  },
});
