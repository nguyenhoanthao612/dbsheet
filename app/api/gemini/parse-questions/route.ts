import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { text, testId } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: "Yêu cầu nội dung câu hỏi hợp lệ" }, { status: 400 });
    }

    const systemInstruction = `Bạn là một chuyên gia khảo thí và chuyên gia AI hàng đầu về kỳ thi IC3 (Internet and Computing Core Certification) phiên bản GS6 và GS5.
Nhiệm vụ của bạn là phân tích văn bản thô được dán từ Word, PDF, Google Docs, hoặc website chứa các câu hỏi luyện thi IC3 và chuyển chúng thành mảng dữ liệu JSON có cấu trúc chuẩn của hệ thống.

Hãy phân tích và tự động tách các câu hỏi, tự nhận diện loại câu hỏi (type), phân chia danh mục (category), lựa chọn (options), đáp án đúng (correctAnswer), giải thích chi tiết (explanation), và mẹo ghi nhớ mascot (tip).

QUY TẮC NHẬN DIỆN CỦA TỪNG LOẠI CÂU HỎI (QuestionType):
1. 'multiple_choice': Chỉ có 1 đáp án đúng trong số các lựa chọn.
2. 'multiple_response': Có từ 2 đáp án đúng trở lên được đánh dấu.
3. 'true_false': Chỉ gồm 2 lựa chọn Đúng/Sai (hoặc True/False).
4. 'matching': Cấu trúc nối cặp ghép cột, ví dụ: 'Email -> Gửi thư', 'Browser -> Trình duyệt'.
5. 'drag_drop': Chứa các ô trống dạng [blank] hoặc ____ cần kéo thả từ danh sách lựa chọn vào.
6. 'fill_blank': Chứa các ô trống cần người dùng tự gõ từ đúng vào mà không có danh sách kéo thả.
7. 'dropdown': Đoạn văn có các ô thả xuống chọn từ thích hợp.
8. 'sequence': Quy trình các bước cần sắp xếp theo đúng thứ tự (ví dụ: Bước 1, Bước 2...).
9. 'hotspot': Câu hỏi yêu cầu click vào một vùng, nút bấm, hay tọa độ nhất định trên hình ảnh/giao diện (ví dụ: 'Hãy click vào nút Save...').
10. 'scenario': Các tình huống/kịch bản giả định dài và thực tế về an toàn thông tin, cộng tác trực tuyến.

QUY TẮC ĐÁNH DẤU ĐÁP ÁN ĐÚNG TRONG VĂN BẢN:
Tìm các từ khóa đánh dấu đáp án đúng như: (Correct), (Đúng), (Correct Answer), (True), (Answer), (✓), (*), [Correct]... để xác định đáp án đúng và chuyển thành cấu trúc dữ liệu chuẩn dưới đây.

QUY TẮC ĐỊNH DẠNG DỮ LIỆU ĐẦU RA CHO TỪNG LOẠI:
- 'multiple_choice':
  + options: mảng chuỗi các lựa chọn (ví dụ: ["Lịch sử duyệt web", "Mục yêu thích", "Trang chủ"]).
  + correctAnswer: số nguyên (0-indexed) chỉ vị trí của đáp án đúng trong mảng options (ví dụ: 1).
- 'multiple_response':
  + options: mảng chuỗi các lựa chọn (ví dụ: ["Bàn phím", "Màn hình", "Chuột", "Máy in"]).
  + correctAnswer: mảng số nguyên (0-indexed) chứa danh sách các đáp án đúng (ví dụ: [0, 2]).
- 'true_false':
  + options: ["Đúng", "Sai"]
  + correctAnswer: boolean (true = Đúng, false = Sai).
- 'matching':
  + options: đối tượng { itemsA: string[], itemsB: string[] } chứa các cặp cần nối. itemsB có thể được xáo trộn ngẫu nhiên.
  + correctAnswer: mảng số nguyên biểu diễn mối quan hệ nối ghép. correctAnswer[i] là chỉ số trong itemsB tương ứng với itemsA[i]. (ví dụ: [1, 0, 2] nghĩa là itemsA[0] nối với itemsB[1], v.v.).
- 'drag_drop':
  + options: đối tượng { textWithBlanks: string, items: string[] } trong đó textWithBlanks chứa '[blank1]', '[blank2]'... và items là danh sách các từ có thể kéo thả.
  + correctAnswer: mảng chuỗi các đáp án tương ứng khớp với [blank1], [blank2]... theo đúng thứ tự.
- 'fill_blank':
  + options: []
  + correctAnswer: mảng chuỗi các từ đúng cần điền theo thứ tự.
- 'dropdown':
  + options: đối tượng { textWithDropdowns: string, dropdownOptions: string[][] } trong đó dropdownOptions là mảng các mảng lựa chọn cho từng ô thả xuống.
  + correctAnswer: mảng chuỗi đáp án đúng cho từng ô thả xuống theo thứ tự.
- 'sequence':
  + options: mảng chuỗi các bước ban đầu (nên xáo trộn nhẹ) (ví dụ: ["Bước B", "Bước A", "Bước C"]).
  + correctAnswer: mảng số nguyên (0-indexed) chỉ thứ tự đúng để sắp xếp lại các bước (ví dụ: [1, 0, 2] nghĩa là Bước A trước, rồi đến Bước B, rồi đến Bước C).
- 'hotspot':
  + options: ["Vị trí hợp lệ"]
  + correctAnswer: đối tượng { x: number, y: number, radius: number } mặc định là { x: 50, y: 50, radius: 10 } (trong đó x, y, radius là phần trăm tương đối từ 0-100 trên hình ảnh).
- 'scenario' / 'image_based':
  + Định dạng như 'multiple_choice' nhưng nội dung tập trung vào tình huống hoặc hình ảnh.

QUY TẮC PHÂN CHIA DANH MỤC (category):
- 'Computing Fundamentals': Nếu nói về phần cứng, hệ điều hành, quản lý file, mạng căn bản, sự cố máy tính.
- 'Key Applications': Nếu nói về Word, Excel, PowerPoint, xử lý văn bản, bảng tính, ứng dụng văn phòng.
- 'Living Online': Nếu nói về trình duyệt web, mạng xã hội, an toàn thông tin trực tuyến, email, cộng tác đám mây.

CẤU TRÚC GIẢI THÍCH (explanation) & MẸO (tip):
- explanation: giải thích tại sao đáp án đó đúng một cách khoa học, chuyên nghiệp, dễ hiểu.
- tip: 1 câu khuyên/mẹo vui nhộn, thân thiện từ Mascot (dưới 20 từ) để giúp học sinh ghi nhớ nhanh khái niệm đó.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Hãy phân tích nội dung câu hỏi sau và chuyển đổi thành danh sách JSON chuẩn:
${text}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Mảng danh sách các câu hỏi đã được phân tích",
          items: {
            type: Type.OBJECT,
            properties: {
              type: {
                type: Type.STRING,
                description: "Loại câu hỏi: 'multiple_choice', 'multiple_response', 'true_false', 'matching', 'drag_drop', 'fill_blank', 'dropdown', 'sequence', 'hotspot', 'scenario', 'image_based'"
              },
              category: {
                type: Type.STRING,
                description: "Danh mục IC3: 'Computing Fundamentals', 'Key Applications', 'Living Online'"
              },
              content: {
                type: Type.STRING,
                description: "Nội dung câu hỏi đầy đủ, sạch sẽ, không có ký hiệu a,b,c đầu dòng"
              },
              options: {
                type: Type.OBJECT,
                description: "Lựa chọn. Với mcq/mr/sequence là mảng chuỗi. Với true_false là ['Đúng', 'Sai']. Với matching là { itemsA: string[], itemsB: string[] }. Với drag_drop là { textWithBlanks: string, items: string[] }. Với dropdown là { textWithDropdowns: string, dropdownOptions: string[][] }. Với fill_blank là mảng rỗng []"
              },
              correctAnswer: {
                type: Type.OBJECT,
                description: "Đáp án đúng. Với mcq/image_based là number (0-indexed). Với mr là number[] (0-indexed). Với true_false là boolean. Với matching/sequence là number[]. Với drag_drop/fill_blank/dropdown là string[]. Với hotspot là { x: number, y: number, radius: number }"
              },
              explanation: {
                type: Type.STRING,
                description: "Giải thích chi tiết vì sao đáp án đúng"
              },
              tip: {
                type: Type.STRING,
                description: "Mẹo ghi nhớ từ Mascot vui nhộn dưới 20 từ"
              }
            },
            required: ["type", "category", "content", "options", "correctAnswer", "explanation", "tip"]
          }
        }
      }
    });

    const parsedText = response.text || "[]";
    const questions = JSON.parse(parsedText);

    // Bổ sung ID và testId cho từng câu hỏi
    const processedQuestions = questions.map((q: any, index: number) => {
      const generatedId = `q_ai_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`;
      return {
        ...q,
        id: generatedId,
        testId: testId || 'OT1_LV1',
      };
    });

    return NextResponse.json({ success: true, questions: processedQuestions });

  } catch (error: any) {
    console.error("Lỗi trong quá trình phân tích bằng Gemini:", error);
    return NextResponse.json({ error: error.message || "Không thể phân tích dữ liệu câu hỏi" }, { status: 500 });
  }
}
