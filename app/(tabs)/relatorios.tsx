import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

// 1. MOCK DE DADOS (Substitua depois pelos seus dados reais ou do Contexto)
const MOCK_FERRAMENTAS = [
  { ID: 1, Nome: 'Furadeira de Impacto', Codigo: 'FRR-0001', Status: 'Disponível', 'Alocado Para': 'Ninguém' },
  { ID: 2, Nome: 'Esmerilhadeira Angular', Codigo: 'FRR-0002', Status: 'Em uso', 'Alocado Para': 'Carlos Mendes' },
  { ID: 3, Nome: 'Serra Circular', Codigo: 'FRR-0003', Status: 'Em uso', 'Alocado Para': 'Ana Souza' },
  { ID: 4, Nome: 'Chave Inglesa', Codigo: 'FRR-0004', Status: 'Em manutenção', 'Alocado Para': 'Ninguém' },
];

export default function RelatoriosScreen() {
  
  // 2. RESUMO VISUAL
  const resumo = useMemo(() => {
    const total = MOCK_FERRAMENTAS.length;
    const emUso = MOCK_FERRAMENTAS.filter(f => f.Status === 'Em uso').length;
    const disponiveis = MOCK_FERRAMENTAS.filter(f => f.Status === 'Disponível').length;
    
    return { total, emUso, disponiveis };
  }, []);

  // 3. FUNÇÃO DE EXPORTAÇÃO EXCEL
  const exportarParaExcel = async () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(MOCK_FERRAMENTAS);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

      const base64Data = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

      // O SEGREDO ESTÁ AQUI: Guardamos o valor numa variável local para o TypeScript confiar
      const cacheDir = FileSystem.cacheDirectory;

      if (!cacheDir) {
        Alert.alert("Erro", "Diretório temporário não encontrado no dispositivo.");
        return;
      }

      // Agora usamos a variável 'cacheDir' que o TypeScript tem certeza que não é nula
      const filePath = cacheDir + 'Inventario_Ferramentas.xlsx';

      await FileSystem.writeAsStringAsync(filePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath);
      } else {
        Alert.alert("Aviso", "O compartilhamento não está disponível neste dispositivo.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível gerar a planilha de Excel.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Relatórios Gerenciais</Text>
        <Text style={styles.headerSubtitle}>Área exclusiva do Almoxarifado</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{resumo.total}</Text>
          <Text style={styles.summaryLabel}>Total de{'\n'}Ferramentas</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#E53935' }]}>{resumo.emUso}</Text>
          <Text style={styles.summaryLabel}>Ferramentas{'\n'}Em Uso</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#43A047' }]}>{resumo.disponiveis}</Text>
          <Text style={styles.summaryLabel}>Ferramentas{'\n'}Disponíveis</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={exportarParaExcel}>
          <Text style={styles.exportButtonText}>📄 Exportar Inventário para Excel</Text>
        </TouchableOpacity>
        <Text style={styles.infoText}>O arquivo gerado conterá ID, Nome, Código, Status e o Operador atual.</Text>
      </View>
    </SafeAreaView>
  );
}

// 4. ESTILOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#757575',
    marginTop: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    width: '30%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  exportButton: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 15,
    width: '100%',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 13,
    paddingHorizontal: 20,
  }
});