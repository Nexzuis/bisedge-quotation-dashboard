import { View, Text, Image } from '@react-pdf/renderer';
import { pdfStyles } from '../styles/pdfStyles';
import { bisedgeLogo } from '../assets';

interface PdfHeaderProps {
  quoteRef: string;
  showBorder?: boolean;
}

export function PdfHeader({ quoteRef, showBorder = true }: PdfHeaderProps) {
  return (
    <View style={showBorder ? pdfStyles.header : { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      {/* Logo (left) */}
      <View>
        <Image src={bisedgeLogo.base64} style={{ width: 120, height: 40 }} />
      </View>

      {/* Quote Reference (right) */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 10, color: '#666666', marginBottom: 2 }}>Quote Reference</Text>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#003B5C' }}>{quoteRef}</Text>
      </View>
    </View>
  );
}
