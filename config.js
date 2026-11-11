/* ══════════════════════════════════════════════════════
   [CONFIG] — Chỉnh thông tin khảo sát tại đây
   Dùng chung cho trang khảo sát (index.html) và trang tổng hợp (admin.html).
   Sau khi sửa câu hỏi: tăng số ?v= ở thẻ <script src="config.js?v=..."> trong
   hai trang để trình duyệt tải bản mới.
   ══════════════════════════════════════════════════════ */
const SURVEY_ID       = "ai-agent-2026";   // khớp với survey.surveys.id trong DB
const SURVEY_TITLE    = "Khảo Sát Thực Trạng Sử Dụng AI Agent";
const SURVEY_SUBTITLE = "Khảo sát thực trạng & nhu cầu hỗ trợ AI Agent — VNGroup 2026";
const SURVEY_DEPT     = "Phòng GPCN — Tập đoàn VNGroup";
const SURVEY_EST_MIN  = "~8'";
const SAVE_KEY        = "vng-survey-ai-agent-thuc-trang-2026";
const EXPORT_FILENAME = "KhaoSat_AI_Agent_VNGroup";
const CONTACT_SEND_TO = "Zalo: tue.duong@jos.com.vn  |  Email: tue.duong@jos.com.vn";
const SURVEY_URL      = "https://vngroup23.github.io/khao-sat-ai-agent/";  // link gửi cho mọi người (mã QR trỏ tới đây)

/* Nơi lưu câu trả lời (Supabase). Khoá publishable được phép công khai: nó chỉ gọi
   được các hàm survey_* trong DB, không đọc được bảng dữ liệu. */
const BACKEND = {
  url: "https://pxabnuplrugmpiagghzk.supabase.co",
  key: "sb_publishable_VNXxwxVch5c2owtoGAUTyQ_SSYpiqFR"
};
/* ══════════════════════════════════════════════════════ */

/* Cờ tuỳ chọn cho mỗi câu hỏi:
   single:true      → chọn 1 đáp án (radio)
   max:N            → chọn tối đa N mục
   chipLabel        → tiêu đề nhóm lựa chọn
   textLabel        → nhãn ô nhập tự do (với type chips+text) */
const QUESTIONS = [
  /* Thông tin người trả lời */
  {
    id:"info", num:"Thông tin ban đầu",
    title:"Thông tin Đơn vị & Người trả lời",
    hint:"Thông tin giúp GPCN phân loại vấn đề theo từng công ty / phòng ban để hỗ trợ đúng nhu cầu. Chỉ dùng nội bộ, không chia sẻ ra ngoài.",
    type:"info"
  },
  /* Câu 1 — Mức độ sử dụng */
  {
    id:"q1", num:"Câu 1", topic:"📍 Hiện trạng",
    title:"Hiện tại bạn đang sử dụng AI Agent (Antigravity hoặc tương tự) trong công việc ở mức độ nào?",
    hint:"AI Agent = AI tự thực hiện chuỗi công việc nhiều bước (đọc file, soạn tài liệu, xử lý Sheets/Drive...), khác với chat hỏi-đáp thông thường. Chọn 1 mức đúng nhất.",
    type:"chips", single:true, chipLabel:"Mức độ sử dụng AI Agent",
    chips:[
      "🚫 Chưa từng dùng / chưa cài đặt được",
      "🔙 Đã thử vài lần nhưng bỏ, không dùng tiếp",
      "🌱 Thỉnh thoảng (vài lần / tháng)",
      "📆 Thường xuyên (hàng tuần)",
      "🚀 Hàng ngày, đã thành thói quen làm việc"
    ]
  },
  /* Câu 2 — Công cụ AI đang dùng */
  {
    id:"q2", num:"Câu 2", topic:"🧰 Công cụ AI",
    title:"Ngoài (hoặc thay cho) AI Agent, bạn đang dùng những công cụ AI nào trong công việc?",
    hint:"Chọn tất cả công cụ bạn dùng ít nhất 1 lần / tháng cho công việc.",
    type:"chips", chipLabel:"Công cụ AI đang dùng",
    chips:[
      "💬 ChatGPT (bản miễn phí / trả phí)",
      "✨ Gemini (web / app)",
      "🧠 Claude",
      "🪟 Microsoft Copilot",
      "📚 NotebookLM",
      "🤖 Google Antigravity / AI Agent / Gemini CLI",
      "🎨 AI trong Canva / công cụ thiết kế, slide",
      "🧾 AI tích hợp trong phần mềm đang dùng (ERP, kế toán, CRM, HRM...)",
      "💼 Công cụ AI cá nhân tự tìm (dịch, tóm tắt, ghi âm họp...)",
      "⛔ Không dùng công cụ AI nào"
    ]
  },
  /* Câu 3 — Công việc chính */
  {
    id:"q3", num:"Câu 3", topic:"📋 Công việc",
    title:"Nhóm công việc nào chiếm nhiều thời gian nhất của bạn / bộ phận bạn hiện nay?",
    hint:"Chọn tối đa các nhóm việc lặp lại thường xuyên nhất. Đây là cơ sở để GPCN chọn use case ưu tiên cho từng bộ phận.",
    type:"chips", chipLabel:"Nhóm công việc tốn thời gian",
    chips:[
      "✉️ Soạn email, công văn, thông báo, văn bản hành chính",
      "📊 Làm báo cáo / tổng hợp số liệu (Excel, Google Sheets)",
      "🧾 Nhập liệu, đối chiếu chứng từ, hoá đơn, sổ sách",
      "📝 Soạn / rà soát hợp đồng, tờ trình, đề xuất, quy chế",
      "🗓️ Họp: chuẩn bị, ghi biên bản, theo dõi action",
      "💬 Chăm sóc khách hàng, trả lời Zalo / Email / Hotline",
      "👥 Tuyển dụng, sàng lọc CV, quản lý hồ sơ nhân sự",
      "📣 Marketing, nội dung truyền thông, thiết kế",
      "📈 Phân tích dữ liệu, nghiên cứu thị trường, tổng hợp tin",
      "📌 Theo dõi tiến độ dự án / công việc, nhắc việc",
      "🏗️ Công việc chuyên ngành đặc thù (xây dựng, vận hành, F&B, BĐS...)"
    ]
  },
  /* Câu 4 — Giải pháp thay thế hiện tại */
  {
    id:"q4", num:"Câu 4", topic:"🔄 Cách làm hiện tại",
    title:"Với những công việc ở Câu 3, hiện tại bạn / bộ phận đang xử lý bằng cách nào (nếu chưa dùng AI Agent)?",
    hint:"Chọn tất cả cách làm đang áp dụng. Ô 'Ý kiến khác / Bổ sung' bên dưới: hãy ghi rõ công cụ / phần mềm cụ thể (VD: MISA, Bitrix, macro Excel...).",
    type:"chips", chipLabel:"Giải pháp / cách làm đang thay thế",
    chips:[
      "✋ Làm thủ công hoàn toàn (Word, Excel, gõ tay)",
      "📐 Dùng file mẫu / template có sẵn, copy-paste",
      "🧮 Công thức / macro / script nâng cao trong Excel, Google Sheets",
      "🖥️ Phần mềm chuyên ngành / ERP / CRM / HRM đang có",
      "💬 Hỏi chatbot (ChatGPT, Gemini...) rồi copy kết quả sang tay",
      "⚙️ Công cụ tự động hoá khác (Zapier, Make, n8n, Power Automate, Apps Script)",
      "👨‍💻 Nhờ IT / đồng nghiệp biết công nghệ làm giúp",
      "🤝 Thuê ngoài / nhờ đối tác thực hiện",
      "📦 Việc tồn đọng, chưa có cách xử lý hiệu quả"
    ]
  },
  /* Câu 5 — Rào cản kỹ thuật */
  {
    id:"q5", num:"Câu 5", topic:"🛠️ Rào cản kỹ thuật",
    title:"Về kỹ thuật & môi trường làm việc, điều gì đang cản trở bạn dùng AI Agent?",
    hint:"Chọn tất cả vấn đề bạn gặp thực tế. Nếu dùng tốt rồi, chọn mục cuối cùng.",
    type:"chips", chipLabel:"Rào cản kỹ thuật / môi trường",
    chips:[
      "⬇️ Không cài đặt được Antigravity (lỗi cài, thiếu quyền Admin)",
      "🔒 Máy công ty bị IT / chính sách chặn cài phần mềm",
      "🐌 Máy tính cấu hình yếu, chạy chậm / treo",
      "🌐 Mạng / VPN / firewall chặn hoặc kết nối không ổn định",
      "🔑 Chưa có tài khoản Google / AI phù hợp (hoặc không đăng nhập được)",
      "💳 Bị giới hạn quota / chưa có gói trả phí",
      "🔌 Không kết nối được với Drive / Sheets / Email / phần mềm đang dùng",
      "❓ Cài được nhưng gặp lỗi không biết cách xử lý",
      "✅ Không gặp rào cản kỹ thuật nào"
    ]
  },
  /* Câu 6 — Rào cản kiến thức & tổ chức */
  {
    id:"q6", num:"Câu 6", topic:"🧩 Rào cản kỹ năng & tổ chức",
    title:"Về kỹ năng, quy trình & tổ chức, điều gì khiến bạn khó dùng AI Agent hiệu quả?",
    hint:"Chọn tất cả lý do đúng với bạn / bộ phận bạn.",
    type:"chips", chipLabel:"Rào cản kỹ năng / quy trình / tổ chức",
    chips:[
      "🤷 Không biết áp dụng vào công việc cụ thể của mình",
      "✍️ Không biết cách ra lệnh / viết prompt để agent làm đúng ý",
      "📉 Kết quả AI hay sai, thiếu tin cậy, phải kiểm tra lại nhiều",
      "⏳ Không có thời gian học và thử nghiệm",
      "🛡️ Lo ngại lộ dữ liệu / chưa có quy định rõ về dữ liệu được phép dùng với AI",
      "🧭 Quy trình công việc hiện tại chưa chuẩn hoá nên khó giao cho AI",
      "🧑‍🤝‍🧑 Không có ai hỗ trợ khi gặp khó khăn",
      "📣 Lãnh đạo bộ phận chưa ủng hộ / chưa ưu tiên",
      "😟 Ngại thay đổi thói quen / lo AI thay thế công việc",
      "🔁 Kiến thức buổi đào tạo quên dần, không có cơ hội thực hành"
    ]
  },
  /* Câu 7 — Kết quả thử nghiệm */
  {
    id:"q7", num:"Câu 7", topic:"🧪 Thử nghiệm thực tế",
    title:"Bạn đã thử dùng AI Agent vào công việc thực tế chưa, và kết quả ra sao?",
    hint:"Chọn tất cả tình huống phù hợp, và mô tả ngắn 1 trường hợp cụ thể (nếu có) vào ô bên dưới — rất giá trị để GPCN hiểu vấn đề thật.",
    type:"chips+text", chipLabel:"Kết quả khi thử",
    textLabel:"Mô tả 1 trường hợp cụ thể đã thử (làm việc gì, thất bại / thành công ở điểm nào)",
    chips:[
      "🏆 Làm được, tiết kiệm thời gian rõ rệt",
      "🛠️ Làm được nhưng phải sửa / kiểm tra lại nhiều",
      "❌ Kết quả sai hoặc không dùng được",
      "⏱️ Mất nhiều thời gian hơn làm tay",
      "🧱 Bị kẹt giữa chừng (lỗi, không biết làm tiếp)",
      "🔎 Chưa thử vào việc thật, chỉ làm theo bài demo / workshop"
    ],
    placeholder:"VD: Tôi thử nhờ agent tổng hợp báo cáo doanh thu từ Google Sheets nhưng bị lỗi quyền truy cập...\nHoặc: Chưa thử vì không biết bắt đầu từ việc nào..."
  },
  /* Câu 8 — Loại dữ liệu */
  {
    id:"q8", num:"Câu 8", topic:"🔐 Dữ liệu",
    title:"Công việc của bạn thường xử lý loại dữ liệu nào?",
    hint:"Giúp GPCN chọn mô hình triển khai phù hợp (an toàn dữ liệu, ẩn danh hoá, chạy cục bộ...). Chọn tất cả loại dữ liệu bạn thường xuyên làm việc cùng.",
    type:"chips", chipLabel:"Loại dữ liệu thường xử lý",
    chips:[
      "💰 Tài chính, kế toán, ngân hàng, thuế",
      "👤 Nhân sự, lương, hồ sơ cá nhân",
      "⚖️ Hợp đồng, pháp lý, thông tin mật của đối tác",
      "🙋 Thông tin khách hàng (cá nhân / doanh nghiệp)",
      "🏘️ Dự án, quy hoạch, hồ sơ pháp lý dự án / tài sản",
      "📑 Văn bản nội bộ thông thường, báo cáo, biểu mẫu",
      "🌍 Thông tin công khai (marketing, truyền thông, thị trường)"
    ]
  },
  /* Câu 9 — Hỗ trợ mong muốn */
  {
    id:"q9", num:"Câu 9", topic:"🤝 Hỗ trợ mong muốn",
    title:"Bạn / bộ phận bạn cần Phòng GPCN hỗ trợ gì nhất để dùng AI Agent vào việc thật?",
    hint:"Chọn tối đa 3 mục quan trọng nhất đối với bạn.",
    type:"chips", max:3, chipLabel:"Hình thức hỗ trợ mong muốn",
    chips:[
      "🧑‍💻 Hỗ trợ cài đặt / xử lý lỗi trực tiếp (tại chỗ hoặc remote)",
      "🎯 Đào tạo riêng theo đúng nghiệp vụ của bộ phận",
      "🧱 Xây sẵn agent / workflow mẫu cho công việc của bộ phận",
      "👥 Cùng ngồi lại phân tích quy trình để chọn use case phù hợp",
      "📖 Tài liệu hướng dẫn / video ngắn từng bước",
      "💬 Nhóm Zalo / kênh hỗ trợ hỏi đáp nhanh",
      "🕐 Lịch Office Hour định kỳ để mang việc thật đến hỏi",
      "🌟 Chỉ định đại sứ AI trong bộ phận để kèm cặp",
      "🛡️ Quy định / hướng dẫn rõ ràng về dữ liệu được phép dùng với AI",
      "🔧 Cấp tài khoản, thiết bị hoặc quota phù hợp"
    ]
  },
  /* Câu 10 — Việc tốn thời gian nhất + góp ý */
  {
    id:"q10", num:"Câu 10", topic:"🎯 Use case ưu tiên",
    title:"Nếu chỉ chọn 1 công việc lặp lại mà bạn muốn AI Agent làm thay nhất, đó là việc gì?",
    hint:"Chọn số giờ bạn mất cho việc đó mỗi tuần, và mô tả theo gợi ý: (1) Việc gì? (2) Hiện đang làm thế nào, dùng công cụ gì? (3) Điểm đau nhất là gì?",
    type:"chips+text", single:true, chipLabel:"Thời gian mất cho việc này mỗi tuần",
    textLabel:"Mô tả công việc ưu tiên: Việc gì · Đang làm thế nào · Điểm đau nhất",
    chips:[
      "⏱️ Dưới 2 giờ / tuần",
      "⏰ 2 – 5 giờ / tuần",
      "🕔 5 – 10 giờ / tuần",
      "🔥 Trên 10 giờ / tuần"
    ],
    placeholder:"VD: (1) Đối chiếu hoá đơn đầu vào với sổ chi tiết cuối tháng\n(2) Hiện làm thủ công bằng Excel + VLOOKUP, 2 người làm 3 ngày\n(3) Dữ liệu từ nhiều nguồn khác định dạng, dễ sai sót"
  }
];
