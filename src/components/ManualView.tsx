import { BookOpen, CheckCircle2, ShieldAlert, Package, Wallet, Eye, Share2, Printer } from 'lucide-react';

export function ManualView() {

  const sections = [
    {
      title: "1. Getting Started | Matakan Farko",
      icon: <BookOpen className="text-blue-500" />,
      items: [
        {
          sub: "Login | Shiga Manhajarta",
          en: "You can log in using your Phone Number (OTP) or Email (Magic Link). This ensures your data is backed up to the cloud.",
          ha: "Kuna iya shiga ta amfani da Lambar Wayarku (OTP) ko Email. Wannan yana tabbatar da cewa bayanan ku suna adana a yanar gizo (cloud)."
        },
        {
          sub: "Setting Up Your Shop | Seta Shago",
          en: "Go to Settings to add your shop's name, logo, and detailed location (Building, Block, Floor, and Landmark).",
          ha: "Je zuwa Saituna (Settings) domin saka sunan shago, hoto (logo), da adireshin shagonku daki-daki."
        }
      ]
    },
    {
      title: "2. Sales & Anti-Scam | Sayarwa da Kariya",
      icon: <ShieldAlert className="text-red-500" />,
      items: [
        {
          sub: "Fake Alert Protection | Kariyar Karya",
          en: "When a customer pays via transfer, a Security Checklist appears. Verify balance before finalizing.",
          ha: "Idan abokin ciniki ya biya ta transfer, manhajar za ta nuna muku Jerin Dubawa. Dole ne ku duba banki kafin ku kammala."
        },
        {
          sub: "Scam Alert | Sanarwar Algungumi",
          en: "If a customer is flagged by other traders, a Red Warning appears instantly.",
          ha: "Idan lambar wayar abokin ciniki tana cikin jerin wadanda aka taba kamawa, manhajar za ta nuna muku Gargadi ja nan take."
        }
      ]
    },
    {
      title: "3. Inventory & Remnants | Kaya da Rage-rage",
      icon: <Package className="text-amber-500" />,
      items: [
        {
          sub: "Remnants | Rage-rage",
          en: "When you cut a bundle, the app tracks leftover yards automatically with a 20% discount.",
          ha: "Idan kuka yanka bundle, manhajar za ta tambaye ku ko akwai rage-rage. Ana adana su daban tare da ragi na kashi 20%."
        }
      ]
    },
    {
      title: "4. Credit (Bashi) | Bashi da Masu Sura",
      icon: <Wallet className="text-kwari-green" />,
      items: [
        {
          sub: "Credit Scores | Taurarin Aminci",
          en: "Customers are ranked 1 to 5 stars based on repayment speed.",
          ha: "Manhajar tana ba abokan ciniki tauraro 1 zuwa 5 dangane da yadda suke biyan bashi."
        }
      ]
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900">User Manual</h2>
        <p className="text-xl font-bold text-kwari-green uppercase tracking-widest">Littafin Jagora</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center space-x-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                {section.icon}
              </div>
              <h3 className="font-black text-gray-800">{section.title}</h3>
            </div>
            <div className="p-6 space-y-8">
              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="space-y-3">
                  <h4 className="text-lg font-bold text-kwari-green flex items-center space-x-2">
                    <CheckCircle2 size={18} />
                    <span>{item.sub}</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-1">English</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.en}</p>
                    </div>
                    <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100/50">
                      <p className="text-[10px] font-black text-kwari-green uppercase mb-1">Hausa</p>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">{item.ha}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 text-white p-10 rounded-[3rem] text-center shadow-2xl">
        <h3 className="text-2xl font-black mb-2 tracking-tight italic">Need Help? | Kuna Bukatar Taimako?</h3>
        <p className="text-gray-400 text-sm mb-6">Contact KwariBook support for training and setup.</p>
        <div className="flex justify-center space-x-4">
           <div className="p-3 bg-white/10 rounded-2xl">
              <Eye className="text-amber-400" />
           </div>
           <div className="p-3 bg-white/10 rounded-2xl">
              <Share2 className="text-blue-400" />
           </div>
           <div className="p-3 bg-white/10 rounded-2xl">
              <Printer className="text-green-400" />
           </div>
        </div>
      </div>
    </div>
  );
}
