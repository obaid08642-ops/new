import React from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { SP, FS, R } from '../constants';
import { useTheme, useLang } from '../context';
import { I as NIcon } from './icons';

interface ContractModalProps {
  visible: boolean;
  onClose: () => void;
  pricingDetails?: { labelAr: string; labelEn: string; price: string | number }[];
}

export const ContractModal: React.FC<ContractModalProps> = ({ visible, onClose, pricingDetails }) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modal: { width: '90%', height: '80%', backgroundColor: theme.bg, borderRadius: R.lg, padding: SP.lg },
    header: { flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md },
    title: { fontSize: FS.lg, fontWeight: 'bold', color: theme.text },
    closeBtn: { padding: SP.xs },
    content: { flex: 1, backgroundColor: theme.surface, padding: SP.md, borderRadius: R.md },
    text: { fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 26 },
    pricingSection: { marginTop: SP.md, padding: SP.md, backgroundColor: theme.surface2, borderRadius: R.sm },
    pricingTitle: { fontWeight: 'bold', marginBottom: SP.sm, color: theme.text },
    pricingRow: { flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 },
    confirmBtn: { padding: SP.md, borderRadius: R.md, backgroundColor: theme.primary, marginTop: SP.md },
    confirmTxt: { color: 'white', textAlign: 'center', fontWeight: 'bold' }
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{AR ? 'عقد تقديم الخدمات' : 'Service Provision Contract'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <NIcon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            <Text style={styles.text}>
              {AR ? `بنود اتفاقية تقديم الخدمات عبر منصة نبض بلس
1. الالتزام بالمعايير الطبية:
يتعهد الطرف الثاني (مقدم الخدمة) بتقديم كافة الخدمات الطبية أو المخبرية أو الصيدلانية أو التمريضية وفق أعلى معايير الجودة المعتمدة من وزارة الصحة.

2. دقة البيانات:
يقر الطرف الثاني بأن كافة التراخيص والبيانات المرفوعة صحيحة وسارية المفعول، ويتحمل المسؤولية القانونية كاملة في حال ثبوت عكس ذلك.

3. معالجة الطلبات:
يلتزم مقدم الخدمة بالاستجابة للطلبات الواردة عبر المنصة في الوقت المحدد (حسب نوع الخدمة)، وتحديث حالة الطلب فور التنفيذ.

4. العمولات والتسويات:
يوافق الطرف الثاني على نسبة العمولة الخاصة بالمنصة والتي يتم اقتطاعها آلياً من المعاملات الناجحة.

5. السرية والخصوصية:
يلتزم الطرفان بالحفاظ على سرية بيانات المرضى وعدم مشاركتها مع أي طرف ثالث.` : `Terms of Service Provision Agreement via Nabd Plus Platform
1. Commitment to Medical Standards:
The Second Party (Service Provider) commits to providing all medical, laboratory, pharmaceutical, or nursing services according to the highest quality standards approved by the Ministry of Health.

2. Data Accuracy:
The Second Party acknowledges that all uploaded licenses and data are correct and valid, and bears full legal responsibility otherwise.

3. Order Processing:
The service provider commits to responding to requests received via the platform within the specified time (depending on the service type), and updating the order status immediately upon execution.

4. Commissions and Settlements:
The Second Party agrees to the platform's commission rate which is deducted automatically from successful transactions.

5. Confidentiality:
Both parties commit to maintaining patient data confidentiality.`}
            </Text>
            
            {pricingDetails && pricingDetails.length > 0 && (
              <View style={styles.pricingSection}>
                <Text style={styles.pricingTitle}>{AR ? 'ملحق التسعير المتفق عليه:' : 'Agreed Pricing Annex:'}</Text>
                {pricingDetails.map((item, idx) => (
                  <View key={idx} style={styles.pricingRow}>
                    <Text style={{color: theme.textSub}}>{AR ? item.labelAr : item.labelEn}</Text>
                    <Text style={{fontWeight: 'bold', color: theme.text}}>{item.price} {AR ? 'ر.س' : 'SAR'}</Text>
                  </View>
                ))}
              </View>
            )}
            
            <Text style={[styles.text, { marginTop: SP.md, fontWeight: 'bold' }]}>
              {AR ? '(يعتبر هذا العقد ملزماً بمجرد التوقيع الرقمي أدناه)' : '(This contract is binding upon digital signature below)'}
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmTxt}>{AR ? 'إغلاق' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
