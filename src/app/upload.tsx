import { createElement, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PrintJobRow = {
  date: string;
  start_time: string;
  end_time: string;
  course_code: string;
  room: string;
  strength: number;
  pdf_path?: string;
  pdf_name?: string;
};

function normalizeDate(value: unknown): string {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return text;
}

function normalizeTime(value: unknown): string {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    return `${String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{1,2})(?:[:.]([0-5]\d))?\s*(AM|PM)?$/i);
  if (!match) return text;
  let hours = Number(match[1]);
  const minutes = match[2] ?? '00';
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

async function readArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
  }

  try {
    return await new File(uri).arrayBuffer();
  } catch (modernError) {
    try {
      return await (await fetch(uri)).arrayBuffer();
    } catch {
      throw new Error(
        'The selected file could not be read. Remove and reselect the file, or run the app with a development build.',
        { cause: modernError }
      );
    }
  }
}

type BrowserFile = {
  name: string;
  size: number;
  type: string;
};

function webFileAsset(file: BrowserFile): DocumentPicker.DocumentPickerAsset {
  return {
    name: file.name,
    size: file.size,
    mimeType: file.type,
    lastModified: 0,
    uri: URL.createObjectURL(file as unknown as Blob),
  };
}

function WebDropBox({
  accept,
  multiple,
  label,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  label: string;
  onFiles: (files: BrowserFile[]) => void;
}) {
  const openPicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = Boolean(multiple);
    input.onchange = () => onFiles(Array.from(input.files ?? []));
    input.click();
  };

  return createElement(
    'div',
    {
      role: 'button',
      tabIndex: 0,
      onClick: openPicker,
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') openPicker();
      },
      onDragOver: (event: DragEvent) => event.preventDefault(),
      onDrop: (event: DragEvent) => {
        event.preventDefault();
        onFiles(Array.from(event.dataTransfer?.files ?? []));
      },
      style: {
        minHeight: 150,
        border: '1px dashed #707070',
        borderRadius: 14,
        background: '#111111',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
        cursor: 'pointer',
        textAlign: 'center',
        padding: 20,
        boxSizing: 'border-box',
      },
    },
    createElement('span', { style: { fontSize: 28, lineHeight: '28px' } }, '+'),
    createElement('strong', { style: { fontSize: 14 } }, label),
    createElement(
      'span',
      { style: { color: '#858585', fontSize: 12 } },
      multiple ? 'Drop PDFs or browse from your device' : 'Drop an Excel file or browse'
    )
  );
}

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const [excelName, setExcelName] = useState('');
  const [pdfNames, setPdfNames] = useState<string[]>([]);
  const [pdfAssets, setPdfAssets] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [parsedRows, setParsedRows] = useState<PrintJobRow[]>([]);
  const [sparePercent, setSparePercent] = useState('10');
  const [processing, setProcessing] = useState(false);

  const selectExcel = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) void processExcelAsset(webFileAsset(file));
      };
      input.click();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    await processExcelAsset(result.assets[0]);
  };

  const processExcelAsset = async (asset: DocumentPicker.DocumentPickerAsset) => {
    try {
      const buffer = await readArrayBuffer(asset.uri);
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const parsed = rows.map((row) => ({
        date: normalizeDate(row['Date']),
        start_time: normalizeTime(row['Start Time']),
        end_time: normalizeTime(row['End Time']),
        course_code: String(row['Course Code'] ?? '').trim(),
        room: String(row['Room'] ?? '').trim(),
        strength: Number(row['Strength'] ?? 0),
      })).filter((row) => row.date && row.course_code && row.room);

      setParsedRows(parsed);
      setExcelName(asset.name);
      Alert.alert('Excel processed', `${parsed.length} print jobs found.`);
    } catch (error) {
      Alert.alert('Could not read Excel', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const selectPdf = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,.pdf';
      input.multiple = true;
      input.onchange = () => {
        const files = Array.from(input.files ?? []);
        const newAssets = files.map(webFileAsset);
        setPdfAssets((current) => {
          const combined = [...current, ...newAssets];
          return combined.filter(
            (asset, index) =>
              combined.findIndex((candidate) => candidate.uri === asset.uri) === index
          );
        });
        setPdfNames((current) => [
          ...new Set([...current, ...files.map((file) => file.name)]),
        ]);
      };
      input.click();
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    setPdfAssets((current) => {
      const combined = [...current, ...result.assets];
      return combined.filter(
        (asset, index) =>
          combined.findIndex((candidate) =>
            candidate.name === asset.name &&
            candidate.size === asset.size &&
            candidate.lastModified === asset.lastModified
          ) === index
      );
    });
    setPdfNames((current) => [
      ...new Set([...current, ...result.assets.map((asset) => asset.name)]),
    ]);
  };

  const processAndSave = async () => {
    if (!parsedRows.length) {
      Alert.alert('Missing Excel file', 'Select and process an Excel file first.');
      return;
    }
    if (!pdfAssets.length) {
      Alert.alert('Missing PDFs', 'Select one or more question paper PDFs.');
      return;
    }

    setProcessing(true);
    try {
      const uploadBatch = await Promise.all(pdfAssets.map(async (pdfAsset) => {
        const safeName = pdfAsset.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const storagePath = `${Date.now()}_${safeName}`;
        const pdfBuffer = await readArrayBuffer(pdfAsset.uri);

        const { error: uploadError } = await supabase.storage
          .from('exam_pdfs')
          .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });
        if (uploadError) throw uploadError;

        return { storagePath, name: pdfAsset.name };
      }));

      const courseCodes = [...new Set(parsedRows.map((row) => row.course_code))];
      const { data: matchData, error: matchError } = await supabase.functions.invoke(
        'extract-course-codes',
        {
          body: {
            storagePaths: uploadBatch.map((pdf) => pdf.storagePath),
            courseCodes,
          },
        }
      );
      if (matchError) {
        let detail = matchError.message;
        const context = (matchError as unknown as { context?: Response }).context;
        if (context) {
          try {
            const responseBody = await context.clone().json() as { error?: string };
            if (responseBody.error) detail = responseBody.error;
          } catch {
            // Keep the standard FunctionsHttpError message if the response has no JSON body.
          }
        }
        throw new Error(detail);
      }

      const matches = (matchData?.matches ?? []) as {
        storagePath: string;
        courseCodes: string[];
        candidates: string[];
      }[];

      const matchedRows = parsedRows.flatMap((row) => {
        const matchingPdf = matches.find((match) =>
          match.courseCodes.some(
            (courseCode) =>
              courseCode.replace(/[^A-Z0-9]/gi, '').toUpperCase()
              === row.course_code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
          )
        );
        if (!matchingPdf) return [];

        const upload = uploadBatch.find((pdf) => pdf.storagePath === matchingPdf.storagePath);
        return [{
          ...row,
          pdf_path: matchingPdf.storagePath,
          pdf_name: upload?.name ?? '',
        }];
      });

      if (!matchedRows.length) {
        throw new Error('No uploaded PDF matched a Course Code in the Excel sheet.');
      }

      const { error: insertError } = await supabase.from('print_jobs').insert(matchedRows);
      if (insertError) {
        throw new Error(insertError.message || 'Could not save print jobs.');
      }

      Alert.alert(
        'Processing complete',
        `${matchedRows.length} matched jobs added to the queue.`
      );
      setPdfNames([]);
      setPdfAssets([]);
      setParsedRows([]);
      setExcelName('');
    } catch (error) {
      Alert.alert('Processing failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  };

  const spare = Number(sparePercent);
  const firstCopies = parsedRows.length
    ? Math.ceil(parsedRows[0].strength * (1 + (Number.isFinite(spare) ? spare : 0) / 100))
    : 0;

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>JOB PREPARATION</Text>
          <Text style={styles.title}>Upload & Process</Text>
        </View>
        <Pressable onPress={() => router.push('/')} style={styles.backButton}>
          <Text style={styles.backText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}>
          <Text style={styles.stepNumber}>01</Text>
          <View style={styles.cardHeadingText}>
            <Text style={styles.cardTitle}>Exam schedule</Text>
            <Text style={styles.cardHint}>Date · Start time · End time · Course code · Room · Strength</Text>
          </View>
        </View>
        {Platform.OS === 'web' ? (
          <WebDropBox
            accept=".xlsx,.xls"
            label={excelName || 'Add exam schedule'}
            onFiles={(files) => {
              const file = files[0];
              if (file) void processExcelAsset(webFileAsset(file));
            }}
          />
        ) : (
          <Pressable style={styles.fileButton} onPress={selectExcel}>
            <Text style={styles.fileButtonText}>{excelName || 'Select Excel file'}</Text>
          </Pressable>
        )}
        {parsedRows.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{parsedRows.length} valid rows</Text>
            <Text style={styles.summaryValue}>First room: {firstCopies} copies</Text>
          </View>
        )}

        <Text style={styles.label}>Spare copies (%)</Text>
        <TextInput
          value={sparePercent}
          onChangeText={setSparePercent}
          keyboardType="numeric"
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}>
          <Text style={styles.stepNumber}>02</Text>
          <View style={styles.cardHeadingText}>
            <Text style={styles.cardTitle}>Question papers</Text>
            <Text style={styles.cardHint}>Add multiple text-based PDFs. Course codes are matched automatically.</Text>
          </View>
        </View>
        {Platform.OS === 'web' ? (
          <WebDropBox
            accept="application/pdf,.pdf"
            multiple
            label={pdfNames.length ? `${pdfNames.length} PDF${pdfNames.length === 1 ? '' : 's'} selected` : 'Add question papers'}
            onFiles={(files) => {
              const pdfFiles = files.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
              const newAssets = pdfFiles.map(webFileAsset);
              setPdfAssets((current) => {
                const combined = [...current, ...newAssets];
                return combined.filter(
                  (asset, index) =>
                    combined.findIndex((candidate) => candidate.uri === asset.uri) === index
                );
              });
              setPdfNames((current) => [
                ...new Set([...current, ...pdfFiles.map((file) => file.name)]),
              ]);
            }}
          />
        ) : (
          <Pressable style={styles.fileButton} onPress={selectPdf}>
            <Text style={styles.fileButtonText}>
              {pdfNames.length ? `${pdfNames.length} PDF${pdfNames.length === 1 ? '' : 's'} selected` : 'Select question paper PDFs'}
            </Text>
          </Pressable>
        )}
        {pdfNames.map((name) => (
          <View key={name} style={styles.fileRow}>
            <Text style={styles.fileDot}>•</Text>
            <Text style={styles.selectedPdfName}>{name}</Text>
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.primaryButton, processing && styles.disabled]}
        onPress={processAndSave}
        disabled={processing}>
        {processing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Process & Save Jobs</Text>}
      </Pressable>

      <Pressable
        style={styles.queueButton}
        onPress={() =>
          router.push({
            pathname: '/queue',
            params: { sparePercent: Number.isFinite(Number(sparePercent)) ? sparePercent : '10' },
          })
        }>
        <Text style={styles.queueText}>Generate Print Queue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#090909' },
  content: { padding: 20, paddingBottom: 48, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 10 },
  eyebrow: { color: '#777777', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', marginTop: 5, letterSpacing: -1 },
  backButton: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#303030', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  backText: { color: '#FFFFFF', fontWeight: '800' },
  card: { backgroundColor: '#111111', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#292929' },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  stepNumber: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#454545', color: '#FFFFFF', textAlign: 'center', lineHeight: 32, fontSize: 10, fontWeight: '900', marginRight: 12 },
  cardHeadingText: { flex: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginBottom: 5 },
  cardHint: { color: '#929292', lineHeight: 20 },
  fileButton: { minHeight: 150, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#707070', backgroundColor: '#161616', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  fileButtonText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  summaryLabel: { color: '#A0A0A0', fontWeight: '700' },
  summaryValue: { color: '#FFFFFF', fontWeight: '900' },
  label: { color: '#BBBBBB', fontWeight: '800', marginTop: 16, marginBottom: 8 },
  input: { height: 48, borderWidth: 1, borderColor: '#3A3A3A', borderRadius: 10, paddingHorizontal: 12, color: '#FFFFFF', backgroundColor: '#090909' },
  primaryButton: { height: 54, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { opacity: 0.65 },
  primaryText: { color: '#090909', fontSize: 16, fontWeight: '900' },
  queueButton: { height: 52, borderRadius: 12, borderWidth: 1, borderColor: '#343434', backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  queueText: { color: '#FFFFFF', fontWeight: '900' },
  fileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  fileDot: { color: '#FFFFFF', marginRight: 8 },
  selectedPdfName: { color: '#AFAFAF', lineHeight: 18, flexShrink: 1 },
});
