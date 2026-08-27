import json
from pathlib import Path

root = Path('/home/ubuntu/nabdah_impl/repo/messages')
translations = {
    'en': {'backToRadiology':'Back to radiology','detailTitle':'Service details','invalidResponse':'The live service response was invalid.','detailDescriptionUnavailable':'No description is available for this service.','turnaround':'{value} hours','fasting':'Fasting may be required','preparationTitle':'Preparation','bookingUnavailableNotice':'Online booking for this service is not available yet.'},
    'ar': {'backToRadiology':'العودة إلى خدمات الأشعة','detailTitle':'تفاصيل الخدمة','invalidResponse':'استجابة الخدمة المباشرة غير صالحة.','detailDescriptionUnavailable':'لا يوجد وصف متاح لهذه الخدمة.','turnaround':'{value} ساعة','fasting':'قد يتطلب صياماً','preparationTitle':'التحضير','bookingUnavailableNotice':'الحجز الإلكتروني لهذه الخدمة غير متاح بعد.'},
    'ur': {'backToRadiology':'ریڈیولوجی پر واپس جائیں','detailTitle':'سروس کی تفصیلات','invalidResponse':'براہ راست سروس کا جواب درست نہیں ہے۔','detailDescriptionUnavailable':'اس سروس کی تفصیل دستیاب نہیں۔','turnaround':'{value} گھنٹے','fasting':'روزہ درکار ہو سکتا ہے','preparationTitle':'تیاری','bookingUnavailableNotice':'اس سروس کی آن لائن بکنگ ابھی دستیاب نہیں۔'},
    'hi': {'backToRadiology':'रेडियोलॉजी पर वापस जाएँ','detailTitle':'सेवा का विवरण','invalidResponse':'लाइव सेवा का उत्तर मान्य नहीं है।','detailDescriptionUnavailable':'इस सेवा का विवरण उपलब्ध नहीं है।','turnaround':'{value} घंटे','fasting':'उपवास आवश्यक हो सकता है','preparationTitle':'तैयारी','bookingUnavailableNotice':'इस सेवा की ऑनलाइन बुकिंग अभी उपलब्ध नहीं है।'},
    'bn': {'backToRadiology':'রেডিওলজিতে ফিরে যান','detailTitle':'সেবার বিবরণ','invalidResponse':'লাইভ সেবার উত্তরটি সঠিক নয়।','detailDescriptionUnavailable':'এই সেবার কোনো বিবরণ পাওয়া যায়নি।','turnaround':'{value} ঘণ্টা','fasting':'উপবাসের প্রয়োজন হতে পারে','preparationTitle':'প্রস্তুতি','bookingUnavailableNotice':'এই সেবার অনলাইন বুকিং এখনও উপলব্ধ নয়।'},
    'fil': {'backToRadiology':'Bumalik sa radiology','detailTitle':'Mga detalye ng serbisyo','invalidResponse':'Hindi wasto ang live na tugon ng serbisyo.','detailDescriptionUnavailable':'Walang available na paglalarawan para sa serbisyong ito.','turnaround':'{value} oras','fasting':'Maaaring kailanganin ang pag-aayuno','preparationTitle':'Paghahanda','bookingUnavailableNotice':'Hindi pa available ang online booking para sa serbisyong ito.'},
}
for locale, additions in translations.items():
    path = root / f'{locale}.json'
    data = json.loads(path.read_text())
    section = data.setdefault('RadiologyServices', {})
    section.update(additions)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
