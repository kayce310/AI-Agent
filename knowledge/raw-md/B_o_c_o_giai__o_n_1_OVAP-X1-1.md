---
source: knowledge/blueprints/Báo cáo giai đoạn 1 OVAP-X1-1.pdf
type: pdf
converted: 2026-05-13T02:58:38.503Z
---

# B_o_c_o_giai__o_n_1_OVAP-X1-1

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 2
Tóm tắt
Báo cáo này trình bày quy trình thiết kế, mô hình hóa và kiểm chứng bước đầu (Giai
đoạn 1) cho hệ thống máy bay không người lái UAV OVAP-X1. Đây là nền tảng siêu
dư cơ cấu chấp hành (Over-actuated) với cấu hình Tilt-Rotor 2 trục kết hợp động cơ
đồng trục (Coaxial), sử dụng 16 đầu vào vật lý để kiểm soát độc lập 6 bậc tự do (6-
DOF).
Nội dung báo cáo được cấu trúc thành bốn phần trọng tâm:
1. Thiết lập mô hình toán học và động học Euler: Hệ thống được mô hình hóa
không gian trạng thái 12 chiều dựa trên động lực học Newton-Euler. Báo cáo
phân tích rõ lý do lựa chọn cấu hình Coaxial nhằm tối ưu không gian và triệt tiêu
momen xoắn, đồng thời lượng hóa các suy hao khí động học phức tạp (hệ số
coax	
 và coax	
 ) của cánh quạt dưới. Việc sử dụng góc Euler được áp dụng để tiếp
cận trực quan và dễ dàng thiết lập chuỗi động học cho cơ cấu servo biến hình.
2. Thiết kế bộ phân bổ giải tích đơn giản (Analytical Mixer): Để quản lý độ
phức tạp, hệ thống sử dụng phương pháp xấp xỉ tĩnh kết hợp thuật toán R-CRM
(Rotor-Coaxial Rotor Mixer). Bằng cách áp dụng triết lý "Nguồn chân lý duy
nhất" (Single Source of Truth) trong quản lý ánh xạ phần cứng, thuật toán thực
hiện phân rã lực và bù trừ đại số trực tiếp để giải trừ liên kết tư thế mà không cần
tính toán ma trận nghịch đảo nặng nề.
3. Kiểm chứng khả năng hoạt động: Kết quả đối chiếu giữa môi trường tính toán
toán học và mô phỏng vật lý đa vật thể (Simulink/Simscape) xác nhận tính đúng
đắn của thiết kế. UAV có thể duy trì trạng thái lơ lửng (hover) ổn định và thể
hiện khả năng tách biệt hoàn toàn chuyển động tịnh tiến khỏi chuyển động quay
(ví dụ: vừa ngóc mũi vừa tiến về phía trước).
4. Tổng hợp hạn chế và định hướng Version 2: Mặc dù hoạt động tốt ở góc
nghiêng nhỏ, bộ phân bổ giải tích tuyến tính bộc lộ điểm yếu chí mạng khi góc
Servo tiệm cận mức cực đại  		75	  , dẫn đến điểm kỳ dị động học, mất khả năng
điều khiển lật dọc và sinh ra nhiễu chéo Yaw gây bão hòa hệ thống. Những hạn
chế này là tiền đề bắt buộc để dự án chuyển sang Giai đoạn 2: Phát triển thuật

-- 1 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 3
toán Phân bổ Giả nghịch đảo có Trọng số (WPIN) nhằm khai thác Không gian
Null (Null-space) và vận hành an toàn ở mọi trạng thái.
Báo cáo này đóng vai trò là cột mốc hoàn thành việc xác thực bản chất vật lý của hệ
thống, chuẩn bị nền tảng cho các bộ điều khiển phi tuyến phức tạp trong tương lai.

-- 2 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 4
I. THIẾT KẾ MÔ HÌNH TOÁN VÀ ĐỘNG HỌC EULER
1. Tổng quan hệ thống và đặc tính Coaxial
1.1. Giới thiệu cấu hình phần cứng
Hệ thống OVAP-X1 được thiết kế dựa trên cấu hình UAV biến hình (Tilt-Rotor) kết
hợp động cơ đồng trục (Coaxial), tạo thành một hệ thống siêu dư cơ cấu chấp hành
(Over-actuated system). Khác với các dòng Multirotor truyền thống chỉ điều khiển
thông qua vận tốc góc của cánh quạt, OVAP-X1 sở hữu 16 bậc tự do đầu vào vật lý độc
lập, bao gồm:
Cấu hình phần cứng cụ thể bao gồm các thành phần chính sau:
 08 Lực đẩy động cơ: Điều khiển thông qua tốc độ quay của 4 cặp động cơ đồng
trục.
 08 Góc bẻ Servo: Cho phép định hướng lại vector lực đẩy trong không gian 3D.
Sự kết hợp này cho phép hệ thống tạo ra lực và mô-men theo mọi hướng mà không cần
thay đổi tư thế khung thân, đạt được khả năng Giải trừ liên kết (Decoupling) hoàn toàn
giữa 6 bậc tự do chuyển động (6-DOF). Mô hình vật lý này là nền tảng để xây dựng các
thuật toán phân bổ lực (Control Allocation) và điều khiển bền vững ở các chương tiếp
theo..
1.2. Nguyên lý hoạt động của cơ cấu Tilt-rotor 2 trục
Cơ cấu Tilt-rotor của hệ thống hoạt động dựa trên nguyên lý chuỗi động học nối tiếp,
tạo thành một hệ thống Gimbal 2 trục cho phép vector lực đẩy của động cơ hướng vào
bất kỳ điểm nào trong không gian làm việc (bán cầu dưới).
Cụ thể, sự phối hợp chuyển động diễn ra theo trình tự sau:
Cấp 1: Cơ cấu Xoay Dọc - Servo gắn trên thân (Body-mounted Servo - Góc
 ):
 Cấu tạo: Được dẫn động bởi Servo gắn cố định trên thân. Trục quay của servo
này trùng với trục B	Y (Pitch axis) của thân máy bay.
 Chức năng: Điều khiển toàn bộ khung bảo vệ chữ U (U-shaped Arm) nghiêng về
phía trước hoặc phía sau.

-- 3 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 5
 	Tác động Lực & Momen:
o 	Tạo ra thành phần lực dọc trục 	 		B 	x	X 	F 	. Đây là thành phần chủ đạo giúp
UAV thực hiện các chuyển động tịnh tiến Tiến/Lùi mà không cần thay
đổi góc Pitch của thân máy.
o 	Hỗ trợ tạo momen Yaw thông qua lực đẩy lệch pha, tuy nhiên hiệu suất
thấp do phương lực đi gần trọng tâm.
Cấp 2: Cơ cấu Xoay Ngang- Servo gắn trên tay chữ U (U-Arm Servo -
 	):
 	Cấu tạo: Được dẫn động bởi Servo gắn trên đỉnh tay chữ U (Arm-mounted
Servo). Trục quay của servo này vuông góc với trục servo cấp 1, tương ứng với
trục 	X 	cục bộ của cánh tay.
 	Chức năng: Điều khiển cụm động cơ đồng trục nghiêng sang trái hoặc sang phải
bên trong lòng khung chữ U.
 	Tác động Lực & Momen:
o 	Tạo ra thành phần lực ngang trục 	 		B 	y	Y 	F 	. Giúp UAV di chuyển tịnh tiến
sang Trái/Phải (Sway).
o 	Kiểm soát Yaw chủ đạo (High Authority Yaw): Do động cơ được bố trí ở
đầu mút cánh tay (cánh tay đòn 	L 	lớn), khi servo này tạo ra lực ngang

-- 4 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 6
y	F 	, nó sinh ra một momen xoắn cực lớn quanh trục đứng 	 		z 	y	M 	F 	L	 	 	.
Đây là cơ chế chính để điều khiển hướng mũi (Heading) của UAV với độ
nhạy cao.
1.3. 	Mục tiêu điều khiển
Khác với các dòng Multi-rotor truyền thống vốn là hệ thống thiếu dẫn động (Under-
actuated), hệ thống OVAP-X1 với cấu hình Tilt-Rotor Coaxial sở hữu 16 đầu vào vật
lý độc lập để kiểm soát 6 bậc tự do. Mục tiêu thiết kế không chỉ dừng lại ở việc ổn định
bay, mà tập trung vào việc khai thác triệt để tính dư dẫn động (Over-actuation) thông
qua các tiêu chí sau:
1.3.1. 	Tách biệt hoàn toàn 6 bậc tự do (Full Decoupling of 6-DOF)
Mục tiêu cốt lõi là phá vỡ ràng buộc động học giữa chuyển động tịnh tiến (Translation)
và chuyển động quay (Rotation). Hệ thống cần đạt được khả năng điều khiển độc lập
cho hai chế độ:
 	Điều khiển Vị trí độc lập (Independent Position Control): Cho phép UAV thực
hiện các chuyển động tịnh tiến dọc trục 	B	X 	(Surge) và 	B	Y 	(Sway) mà không cần
thay đổi góc tư thế (Roll/Pitch).
o 	Cơ chế thực hiện:

-- 5 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 7
 Chuyển động Surge (Tiến/Lùi): Sử dụng phối hợp 4 Servo Thân
 để nghiêng vector lực dọc trục X.
 Chuyển động Sway (Trái/Phải): Sử dụng phối hợp 4 Servo Tay

để nghiêng vector lực dọc trục Y.
o Ứng dụng: Giữ camera/cảm biến thăng bằng tuyệt đối (Level flight) khi
bay ngang, hoặc di chuyển chính xác (Fine-tuning position) trong không
gian hẹp.
 Điều khiển Tư thế độc lập (Independent Attitude Control): Cho phép thay đổi
góc Pitch  		
 và Roll  		
 tùy ý trong khi vẫn giữ nguyên vị trí đứng yên
(Hover).
o Ứng dụng: Chúi mũi (Pitch down) để hướng camera xuống mục tiêu hoặc
thực hiện các pha bay diễn tập mà không bị trôi vị trí do thành phần lực
ngang của trọng lực.
1.3.2. Bám quỹ đạo chính xác (Precision Trajectory Tracking)
Mục tiêu là đảm bảo vector trạng thái đầu ra 	 	T
y x y z	
  	 	bám sát theo
tín hiệu đặt ref	y với sai số xác lập tiến về 0.
 Khả năng đáp ứng quá độ nhanh: Nhờ khả năng vector hóa lực đẩy (Thrust
Vectoring), UAV có thể tạo ra lực điều hướng tức thời cmd	F mà không cần chờ
thời gian trễ để xoay momen quán tính của toàn bộ thân máy bay như các drone
truyền thống. Đặc tính này đặc biệt quan trọng khi bay bám theo các quỹ đạo gấp
khúc hoặc biến thiên nhanh.
1.3.3. Kháng nhiễu chủ động (Active Disturbance Rejection)
Một trong những hạn chế lớn nhất của các loại UAV truyền thống (Under-actuated) là
sự phụ thuộc chặt chẽ giữa góc nghiêng và lực di chuyển. Khi gặp gió tạt ngang hoặc
nhiễu động khí quyển, bộ điều khiển bắt buộc phải thay đổi góc Roll/Pitch của thân máy
bay để sinh ra thành phần lực kháng lại gió. Điều này gây ra rung lắc, làm mất ổn định
khung hình camera và giảm độ chính xác của các tác vụ thao tác.
Hệ thống Tilt-Rotor Coaxial 6-DOF khắc phục triệt để vấn đề này thông qua chiến lược
Kháng nhiễu Tĩnh (Static disturbance rejection), cụ thể như sau:

-- 6 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 8
 Nguyên lý Bù lực trực tiếp (Direct Force Compensation): Khi bộ quan sát trạng
thái (State Observer) hoặc cảm biến gia tốc phát hiện một lực nhiễu ngoại sinh
ext	F (ví dụ: gió tạt từ hướng bên phải), bộ điều khiển sẽ tính toán và điều hướng
các vector lực đẩy của động cơ thrust	F 	sao cho sinh ra một hợp lực đối kháng
counter 	ext	F 	F	  ngay lập tức.
 Cơ chế hoạt động cụ thể:
o Kháng gió ngang (Crosswind): Hệ thống điều khiển các Servo Tay  		

nghiêng đồng loạt về phía gió thổi tới để tạo lực đẩy ngang y	F . Thân máy
bay vẫn giữ nguyên trạng thái cân bằng  		0	
   .
o Kháng gió dọc (Headwind/Tailwind): Hệ thống điều khiển các Servo
Thân  		
 nghiêng về phía trước hoặc sau để tạo lực đẩy dọc x	F , giữ cho
máy bay không bị trôi đi mà không cần phải chúi mũi  		0	
   .
 Ưu điểm vận hành: Khả năng tách biệt hoàn toàn giữa việc "giữ vị trí" và "giữ
tư thế" giúp UAV trở thành một nền tảng bay siêu ổn định. Điều này đặc biệt
quan trọng trong các ứng dụng:
o Quay phim/Chụp ảnh: Giữ đường chân trời luôn thẳng tắp ngay cả trong
điều kiện gió giật cấp cao.
o Kiểm tra công trình (Inspection): Duy trì khoảng cách an toàn cố định với
bề mặt công trình thẳng đứng (như tuabin gió, tòa nhà kính) mà không sợ
các dao động góc nghiêng gây va chạm cánh quạt.
1.4. Đặc tính Động cơ Đồng trục phi lý tưởng (Coaxial Characteristics)
Cấu hình đồng trục (Coaxial) mang lại ưu điểm tuyệt đối về sự nhỏ gọn và khả năng
triệt tiêu momen xoắn, tuy nhiên nó tạo ra sự phi tuyến phức tạp về khí động học. Cánh
quạt phía dưới phải hoạt động trong vùng luồng xả nhiễu động do cánh quạt phía trên
ép xuống, làm suy giảm nghiêm trọng hiệu suất.
Để mô hình hóa chính xác bộ trộn động cơ (Mixer), lực đẩy và momen xoắn ròng tại
mỗi cụm nhánh i được định nghĩa:
2 	2
, 	, 	,	i 	f upper i coax f lower i	T 	K 	K	
	   	 	

-- 7 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 9
 	2 	2
, 	, 	,	i i Q upper i coax lower i	M 	S K	
	  	 	 	
Trong đó:
 coax	
 : Hệ số suy giảm hiệu suất lực đẩy của cánh dưới do nhiễu động khí động
học đồng trục (giá trị thực nghiệm thường rơi vào khoảng 0.75 	0.9	coax	
	 	 ).
 coax	
 : Hệ số hiệu suất khí động học của cánh dưới ảnh hưởng đến momen quay
 		0 	1	coax	
	 	 .
 i	S : hệ số quy định chiều quay vật lý của động cơ trên tại nhánh $i$, có tác dụng
định hướng vector momen dọc trục 	 		1,1	i	S   .
Bài toán đặt ra cho thuật toán: Do sự tồn tại của coax	
 và coax	
 , việc cấp chung một tín
hiệu tốc độ vòng quay  		upper 	lower	 	  	sẽ không triệt tiêu được momen xoắn
 		, 0	i	M   . Thuật toán Phân bổ (Allocation) phải làm nhiệm vụ nội suy ngược: từ một
lệnh tổng lực  		,i	T và lệnh momen Yaw mong muốn, giải ngược ra chênh lệch tốc độ
cần thiết cho từng động cơ sao cho bù đắp được sự hao hụt này một cách hoàn hảo.
2. Hệ quy chiếu và động lực học Euler
2.1. Hệ quy chiếu
Việc mô tả chuyển động của UAV yêu cầu xác định rõ mối quan hệ giữa hai hệ quy
chiếu cơ bản: Hệ Quán tính (gắn với mặt đất) và Hệ Thân (gắn với máy bay).
a. Hệ quy chiếu Quán tính (Inertial Frame - E	F Gọi tắt là hệ quy chiếu E): Được
gắn cố định tại điểm cất cánh trên mặt đất, dùng để xác định vị trí (x,y,z) trong
bài toán dẫn đường (Navigation). Tuân theo chuẩn NED (North-East-Down):
 Gốc E	O : Điểm cất cánh.
 Trục E	X (North): Hướng về Bắc địa lý.
 Trục E	Y (East): Hướng về Đông địa lý.
 Trục E	Z (North): Hướng thẳng đứng xuống tâm Trái Đất.

-- 8 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 10
b. 	Hệ quy chiếu Thân máy bay (Body Frame - 	B	F 	- gọi tắt là hệ quy chiếu B): Được
gắn liền với cấu trúc cơ khí của UAV, dùng để tính toán lực, momen và dữ liệu
cảm biến (IMU). Tuân theo quy tắc bàn tay phải (Right-hand rule):
 	Gốc 	B	O 	: Trùng với Trọng tâm (Center of Gravity - CoG) của hệ thống.
 	Trục 	B	X 	(Roll Axis): Hướng về phía Mũi máy bay (Front).
 	Trục 	B	Y 	(Pitch Axis): Hướng sang bên Phải máy bay (Right).
 	Trục 	B	Z 	(Yaw Axis): Trục vuông góc với mặt phẳng thân máy bay, hướng
từ trọng tâm xuống phía đất (Down).
c. 	Ma trận quay (Rotation Matrix - E
B	R 	): Dùng để chuyển đổi vector từ hệ Thân
sang hệ Quán tính. Sử dụng thứ tự quay Euler Z-Y-X (Yaw
 	 	Pitch
 	
Roll
 	).
2.2. 	Ma trận Xoay và quan hệ Động học
Việc chuyển đổi vector từ hệ 	B	F 	sang hệ 	E	F 	được thực hiện thông qua ma trận Xoay
E
B	R 	(Rotation Matrix). Chúng ta sử dụng quy ước góc Euler theo trình tự Z-Y-X (
 	
 	
 	) tương ứng với Yaw – Pitch - Roll.
Vector góc tư thế Euler: 	 	T
 	 	 		
	
 	: Góc quay quanh trục X.

-- 9 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 11
	
 : Góc quay quanh trục Y.
	
 : Góc quay quanh trục Z.
Ma trận quay tổng hợp 	 	 	 	 	 		Z 	Y 	X	R R 	R 	R	
 	 		 	được xác định như sau:
E
B
c c s s c c s c s c s s
R 	c s s s s c c c s s s c
s 	s c 	c c
           
           

	 
	 
 		 	
 	 	 	 	
 			 	
Trong đó 	cos	c  	và 	sin	s  . Ma trận này trực giao, tức là  	 	 	
1 	T	E 	E 	B
B 	B 	E	R 	R 	R

 	 .
2.3. Định nghĩa Vector trạng thái
Để xây dựng mô hình không gian trạng thái (State-Space Model) phục vụ cho việc thiết
kế bộ điều khiển phi tuyến 6 bậc tự do, hệ thống được mô tả đầy đủ bởi một vector trạng
thái  	12
x   . Vector này là sự kết hợp của các biến động học (vị trí, góc) và động lực
học (vận tốc dài, vận tốc góc).
Vector trạng thái tổng quát được định nghĩa như sau:
 	
T
x 	x y z u v w 	p q r


  


 
 
 	 	
 
 
 
Chi tiết các vector thành phần:
 	 		, , T
x y z	
  	: Vector vị trí của trọng tâm UAV trong hệ E.
 	 		, , T
u v w	
  	: Vector vận tốc tịnh tiến trong hệ B.
 	 		, , T
   	 	: Vector góc Euler (Roll, Pitch, Yaw) biểu diễn hướng của hệ B so
với hệ E.
 	 		, , T
p q r	
  	: Vector vận tốc góc trong hệ B.
2.4. Quy ước Cấu hình Hình học và Thứ tự

-- 10 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 12
Cấu hình hình học ảnh hưởng trực tiếp đến ma trận phân phối lực và momen của hệ
thống. Khác với các mô hình quadrotor truyền thống cố định, cơ cấu Tilt-Rotor 2 trục
tạo ra hiệu ứng "cánh tay đòn động" do tâm cánh quạt di chuyển liên tục trong không
gian 3D khi các servo xoay.
a. Định nghĩa tham số:
 Gọi x	d : Là tọa độ hình học dọc theo trục B	X tính từ Trọng tâm (CoG) đến
tâm ngàm xoay cố định (giao điểm của 2 trục servo) của cụm cánh tay.
 Gọi y	d : Là tọa độ hình học dọc theo trục B	Y tính từ Trọng tâm (CoG) đến
tâm ngàm xoay cố định (giao điểm của 2 trục servo) của cụm cánh tay.
 Gọi top	h và bot	h : Là khoảng cách lệch tâm đo dọc theo trục cục bộ của cụm
động cơ, tính từ tâm ngàm xoay cố định đến mặt phẳng đĩa cánh quạt trên và
dưới. (Quy ước: hướng xuống theo trục Z cục bộ là chiều âm).
 Gọi eff	h Là khoảng cách đến Tâm lực đẩy hiệu dụng của hệ đồng trục. Do
cánh dưới bị suy giảm lực đẩy bởi hệ số coax	
 , tâm lực đẩy tổng hợp sẽ không
nằm ở chính giữa mà hơi lệch về phía cánh quạt trên.
b. Vector vị trí ngàm xoay cố định  		pivot	r
Gọi 	,	pivot i	r 	là vector tọa độ của tâm ngàm xoay Servo thứ i gắn trên khung chính.
Dựa trên cấu hình Rectangular X (1-Front Right, 2-Rear Left, 3-Front Left, 4-Rear
Right):
,1 	,2 	,3 	,4	, 	, 	,
0 	0 	0 	0
x 	x 	x 	x
pivot 	y 	pivot 	y 	pivot 	y 	pivot 	y
d 	d 	d 	d
r 	d 	r 	d 	r 	d 	r 	d
 		  	  	  	 
  	  	  	  	  	  	  	  	  	 
  	  	  	 	  	  	  	 
c. Cánh tay đòn động  		,	total i	r
Do hệ thống sử dụng cấu hình động cơ đồng trục (Coaxial), tại mỗi cụm nhánh sẽ
tồn tại hai mặt phẳng đĩa cánh quạt (trên và dưới) đặt cách nhau một khoảng vật lý.
Để thiết lập mô hình toán học tập trung, ta định nghĩa khái niệm "Tâm sinh lực tương
đương" (Equivalent Thrust Center). Đây là một điểm ảo nằm trên trục quay của cụm

-- 11 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 13
động cơ (thường là trung điểm giữa hai đĩa cánh), đại diện cho điểm đặt của tổng
vector lực đẩy.
Gọi prop	h là hằng số thiết kế đại diện cho khoảng cách vật lý từ tâm ngàm xoay Servo
đến tâm sinh lực tương đương này, đo dọc theo trục E	Z	 cục bộ của cụm động cơ.
Trong trạng thái bay, do hệ thống sử dụng cơ cấu 2 servo điều khiển độc lập cho
mỗi nhánh  		1..4	i  	, nên khi các góc nghiêng i	
 và i	
 mang các giá trị khác nhau
sẽ dẫn đến việc 4 cụm đồng trục sẽ không nằm trên cùng một mặt phẳng ngang, mà
có sự dịch chuyển không gian độc lập.
Độ dời tương đối 	,	offset i	r 	của tâm cánh quạt thứ i trong hệ quy chiếu Thân B	F được
xác định chính xác bằng phép chiếu đoạn prop	h qua ma trận quay của servo tương
ứng:
 	 	 	
 	 	 	
 	
 	 	 	
,
sin 	cos	0
0 	sin
cos 	cos
prop 	i 	i
offset i 	y i x i 	prop 	i
prop 	prop 	i 	i
h
r 	R 	R 	h
h 	h
 	
 	
	
 	
 		 	  		 	
 	 		 		 	  		 		 		 	  		 	
Vector cánh tay đòn thực tế tính từ Trọng tâm máy bay đến điểm sinh lực của cụm
động cơ thứ i được cập nhật liên tục theo phương trình:
, 	, 	,
ix
total i pivot i offset i 	iy
iz
r
r 	r 	r 	r
r
 
 
 	 	  
 
 
Do i	
 và i	
 điều khiển độc lập ở mỗi nhánh, thành phần iz	r sẽ khác 0 và mang các
giá trị khác nhau tại mỗi cụm động cơ.
2.5. Động học
2.5.1. Vị trí tịnh tiến
Mối quan hệ giữa vận tốc thay đổi vị trí trong hệ quán tính  		
 và vận tốc trong hệ thân
 		
 là phép quay:

-- 12 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 14
E
B	R	
 			
E
B
x 	u
y R v
z 	w
  	 
  	   	 
  	 	  	 



2.5.2. Tư thế Quay
Mối quan hệ giữa tốc độ thay đổi góc Euler  		
 và vận tốc góc thân  		 không phải là
phép quay đơn thuần mà thông qua ma trận Jacobian góc (Angular Rate Transformation
Matrix)  		W :
1 	0 	sin
0 cos 	sin cos
0 sin cos cos
p
q
r
 	

	 	  
 	  
 		   	  	   	 	 	 	   	  	   			   	  



Suy ra phương trình vi phân cho góc Euler (nghịch đảo mối quan hệ trên):
1 sin tan 	cos tan
0 	cos 	sin
0 sin / cos cos / cos
p
q
r

	  	 
 
	
	

	 	 	 	
   	  
   	   	 		   	  
   	  	 	  	 



Lưu ý: Phương trình này có điểm kỳ dị (singularity) tại 	90	
    (Gimbal Lock). Tuy
nhiên, trong điều kiện hoạt động bình thường của UAV, góc Pitch hiếm khi đạt đến
90	  . Nếu cần bay nhào lộn toàn phần, cần chuyển sang biểu diễn Quaternion.
3. Mô hình Cơ cấu chấp hành và Phân phối lực
Phần này xây dựng mối quan hệ toán học giữa các biến đầu vào vật lý (tốc độ động cơ,
góc servo) và hợp lực/momen tác dụng lên thân máy bay. Do đặc thù của cơ cấu Tilt-
rotor 2 trục, tâm sinh lực di chuyển liên tục trong không gian, biến bài toán phân phối
lực tĩnh truyền thống thành một hệ thống phụ thuộc trạng thái.
3.1. Động học Cơ cấu Tilt 2 Trục và Momen Cục bộ
Xét cụm động cơ tại nhánh thứ  		1, 2, 3, 4	i i  	. Lực đẩy sinh ra bởi cặp motor đồng trục

-- 13 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 15
được định hướng lại thông qua chuỗi động học của 2 servo: Servo Thân (góc i	
 quay
quanh trục B	Y ) và Servo Tay (góc i	
 quay quanh trục B	X ).
a. Quy ước dấu Momen nội tại:
Để triệt tiêu momen xoắn khi bay cân bằng, cặp động cơ đồng trục quay ngược chiều
nhau. Gọi 	 		1,1	i	S   	là hệ số quy định chiều quay của Động cơ Trên tại nhánh i:
 	1	i	S  : Động cơ Trên quay ngược chiều kim đồng hồ (CCW), sinh ra momen
phản lực thuận chiều kim đồng hồ (+Z cục bộ).
 	1	i	S   : Động cơ Trên quay cùng chiều kim đồng hồ (CW), sinh ra momen
phản lực nghịch chiều kim đồng hồ (-Z cục bộ).
Dựa trên thứ tự động cơ chuẩn (1-Front Right, 2-Rear Left, 3-Front Left, 4-Rear
Right), hệ số chiều quay được xác định cụ thể như sau:
 Nhánh 1 và 2: Động cơ Trên quay CCW 	1 1,	S	  2 1	S 
 Nhánh 3 và 4: Động cơ Trên quay CW 	3 1,	S	   4 1	S  
b. Lực đẩy và Momen trong Hệ tọa độ Cục bộ
Từ tốc độ quay của động cơ trên  		,	upper i	 	và dưới  		,	lower i	 	, cụm đồng trục tạo ra
hai thành phần vật lý độc lập:
 Tổng lực đẩy  		,i	T : Hướng xuống dọc theo trục Z cục bộ, đẩy máy bay bay
lên. Có tính đến hệ số suy giảm hiệu suất cánh dưới coax	
 .
2 	2
, 	, 	,	i 	f upper i coax f lower i	T 	K 	K	
	   	 	
Theo nguyên lý trượt lực, tổng lực đẩy ,i	T này được mô hình hóa như một
vector lực duy nhất đặt tại tâm lực đẩy hiệu dụng eff	h , trượt dọc theo trục Z
cục bộ của động cơ.

-- 14 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 16
 	Độ lệch Momen xoắn 	 		,i	M 	: 	Sinh ra do sự chênh lệch tốc độ giữa hai động
cơ, là thành phần nội tại hỗ trợ điều khiển hướng mũi (Yaw) mà không cần
nghiêng vector lực đẩy.
 	2 	2
, 	, 	,	i 	i 	Q 	upper i 	lower i	M 	S K	
	 	 	 	 	
Trong đó các tham số được định nghĩa như sau:
 	,i	T 	: Tổng độ lớn lực đẩy sinh ra tại nhánh 	i.
 	,i	M 	 	:Tổng độ lớn momen phản lực sinh ra tại nhánh 	i.
 	f	K 	: Hệ số lực đẩy của cánh quạt, đặc trưng cho biên dạng cánh và mật độ
không khí.
 	Q	K 	: Hệ số momen cản của cánh quạt.
 	, 	,	,	upper i 	lower i	 	 	: Vận tốc góc của động cơ trên và động cơ dưới tại nhánh 	i.
 	coax	
 	: Hệ số suy giảm hiệu suất lực đẩy của cánh dưới do nhiễu động khí động
học đồng trục (giá trị thực nghiệm thường rơi vào khoảng 	0.75 	0.9	coax	
	 	 	).
	
 	: Hệ số hiệu suất khí động học của cánh dưới ảnh hưởng đến momen quay
 		0 	1	
	 	 	.
 	i	S 	: Hệ số chiều quay của động cơ trên tại nhánh 	i 	 		 		1,1	i	S 	  	, dùng để quy
định chiều của vector momen dọc trục.
Trong hệ tọa độ Cục bộ của giá đỡ động cơ (trục Z hướng xuống), vector Lực và
Momen được biểu diễn dưới dạng vector 3 chiều:

-- 15 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 17
,
,
0
0 ,	local i
i
F
T
 	
 	
  	
 			 	
,
,
0
0	local i
i
M
M 
 	
 	
  	
 	
 	
3.2. Phép chiếu Lực và Momen sang Hệ Thân
Khi đi qua chuỗi động học của Servo Thân (quay
 quanh trục Y) và Servo Tay (quay
 quanh trục X), trục local	Z	 	(chiều của lực đẩy) sẽ bị biến đổi thành một vector định
hướng không gian ,	dir i	v trong Hệ Thân B	F :
 	 	 		,
0 	sin( )cos( )
0 	sin( )
cos( ) cos( )	1
i 	i
dir i 	y i x i 	i
i 	i
v 	R 	R
 	
 	
	
 	
	   	
   	 	   	
   				   	
Lúc này, tác động của cụm đồng trục thứ i lên hệ trục trọng tâm máy bay được phân rã
thành:
 Thành phần Lực tịnh tiến:
,
, 	, 	, 	,
,
sin( )cos( )
sin( )
cos( ) cos( )
i 	i 	i
B i 	i dir i 	i 	i
i 	i 	i
T
F 	T v 	T
T
 	

 	

 	

 		
 	
  	  	
 			 	
 Thành phần Momen nội tại:
 		_ , 	, 	, 	,
sin( )cos( )
sin( )
cos( ) cos( )
i 	i
coax body i 	i 	dir i 	i 	i
i 	i
M 	M 	v 	M
 	

 	
 	
 	
 	 	  	 	 	
 		 	
Giải thích cơ học về vector  		,	dir i	v	 	:
Trong hệ tọa độ hàng không chuẩn NED, trục Z dương  		Z	 luôn hướng xuống đất.
Vector ,	dir i	v được định nghĩa là hướng của Lực đẩy (hướng vút lên trên dọc theo trục
motor). Do đó, vector âm của nó là  		,	dir i	v	 	đóng vai trò như một "trục tọa độ gốc"
dọc theo thân motor, luôn chĩa xuống dưới.

-- 16 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 18
Việc nhân đại lượng vô hướng ,i	M (vốn đã bao hàm hệ số bố trí chiều quay i	S của
từng nhánh) với vector  		,	dir i	v	 	mang lại hai ý nghĩa cốt lõi:
1. Tự động lật chiều Momen xoắn 3D một cách chuẩn xác để phản ánh đúng bố
trí cánh thuận/cánh nghịch của từng cụm động cơ.
2. Tính toán chính xác lượng Momen Yaw bị "rò rỉ" chuyển hóa thành lực lật
(Roll/Pitch) khi cánh tay máy bị nghiêng đi các góc
 ,
 . Đây là cơ sở bắt
buộc để bộ điều khiển có thể dự báo và bù trừ nhiễu chéo trong các hệ thống
Tilt-Rotor 6-DOF.
3.3. Vector trạng thái điều khiển
Do tính phi tuyến của các hàm lượng giác  		sin,cos , việc đưa trực tiếp các góc  		,	
 
vào ma trận phân phối lực sẽ tạo ra một bài toán phi tuyến phức tạp, khó giải thời gian
thực. Ta định nghĩa vector trạng thái điều khiển trung gian 4
i	u   cho mỗi cụm động
cơ i, bao gồm 3 thành phần lực tịnh tiến và 1 thành phần momen xoắn nội tại:
,
ix
iy
iz
i
i
F
F
u F
M
 	
 	
 	  	
 	
 		 	
Gộp 4 nhánh lại, hệ thống có vector điều khiển tổng quát:
3
16
1 2 	4	, , ,T T T T
u u u u u	 		 	 	 
Sau khi bộ Control Allocation giải ra được vector i	u tối ưu, ta sử dụng Động học ngược
(Inverse Kinematics) để ánh xạ về các lệnh vật lý thực tế:
 Tổng lực đẩy yêu cầu ,i	T :
2 	2
,
2
i 	i	i 	x 	iy 	z	T 	F 	F 	F	  	 	
 Góc Servo Thân yêu cầu  		i	
 :
 		atan 2 	,	ix iz	i 	F F	
  	 

-- 17 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 19
 Góc Servo Tay yêu cầu  		i	
 :
 	2 	2
atan 2 ,	iy	i 	ix iz	F F F	
  	
 Momen nội tại yêu cầu  		,i	M  : (Sử dụng trực tiếp để phân bổ chênh lệch tốc độ
cho 2 motor đồng trục).
Từ đây, ta có thể ánh xạ ngược (Inverse Kinematics) để tìm các giá trị vật lý  		, ,	i i i	T	
 
Atừ vector mong muốn:
1. Lực đẩy tổng  		i	T :
2 	2 	2
ix 	iy 	iz	i 	F 	F	T 	F	 	 	
2. Góc Servo Thân  		i	
 :
 		atan 2 	,	ix iz	i 	F F	
  	 
3. Góc Servo Tay  		i	
 :
 	2 	2
atan 2 ,	iy	i 	ix iz	F F F	
  	
3.4. Xây dựng Ma trận Phân phối A  		,	
 
Dựa trên các phân tích động lực học tại nhánh, ta định nghĩa vector trạng thái điều khiển
trung gian 4
i	u   cho mỗi cụm động cơ i , bao gồm 3 thành phần lực tịnh tiến và 1
thành phần momen xoắn nội tại:
,
T
ix iy i	i 	z 	i	u 	F F F M	
 		  	
Gộp cả 4 nhánh , vector đầu vào toàn cục của hệ thống được cấu trúc dưới dạng 16
i	u   :
1 	2 3 4
T	T T T T
u u u u u	 		  	
Mối quan hệ tuyến tính giữa vector điều khiển u và vector hợp lực/momen tác dụng
lên trọng tâm 	, , , , , T
x y z x y z	F F F M M M	
  		  	 được biểu diễn qua phương trình:

-- 18 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 20
 		,	A 	u	
 	 	
Trong đó,  	 6 16
,	A
  
  là ma trận phân phối phụ thuộc trạng thái. Ma trận toàn cục
này được ghép nối từ 4 ma trận phân phối cục bộ 6 4
i	A 
  tương ứng với 4 nhánh:
 	 	 		1 2 3 4	,	A 	A A A A	
  
Tại mỗi nhánh i , cấu trúc của ma trận i	A được thiết dưới dạng ma trận khối nhằm phân
tách rõ ràng sự đóng góp vào Lực tịnh tiến (3 hàng đầu) và Momen quay (3 hàng sau)
đối với Trọng tâm máy bay:
 	
3 3 	3 1
, 	,
0
i
total i 	dir i
I
A S r 	v
 		 	
  	 	
Các thành phần nội tại của i	A gồm:
 3 3	I  (Ma trận đơn vị 3x3): Đại diện cho hệ số truyền lực tịnh tiến. Ánh xạ nguyên
vẹn 100% vector lực đẩy sinh ra tại đầu cánh tay 	, , T
x y z	F F F	 	 	 vào tổng lực tịnh
tiến của toàn hệ thống.
 3 1	0  (Vector không 3x1): Khẳng định tính chất vật lý: Momen xoắn nội tại của
cụm động cơ đồng trục  		,i	M hoàn toàn không sinh ra lực tịnh tiến làm thay
đổi vị trí Trọng tâm.
 	 		,	total i	S r 	(Ma trận phản đối xứng): Là ma trận Skew-symmetric của vector cánh
tay đòn động 	,	total i	r . Thành phần này chuyển đổi phép nhân có hướng  		,	total i i	r 	F	
thành phép nhân ma trận tuyến tính, dùng để tính toán chính xác lượng Momen
ngoại lực (sức bẩy) sinh ra do lực đẩy đặt cách xa Trọng tâm.
 	,	dir i	v	 	(Vector định hướng Momen): Đóng vai trò là vector chỉ thị không gian
3D. Nó phân bổ Momen xoắn nội tại  		,i	M vào đúng các trục Roll  		B	X , Pitch
 		B	Y , Yaw  		B	Z của thân máy bay, tỷ lệ thuận với góc nghiêng servo i	
 , i	
 tại
thời điểm hiện tại.

-- 19 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 21
Thay 	các 	biểu 	thức 	toán 	học 	của 	, 	, , T
total i 	ix iy iz	r 	r r r	 		  	 và
 		, sin( )cos( ), sin( ),cos( ) cos( ) T
dir i 	i 	i 	i 	i 	i	v	
 	
	 	 		 	 	 	đã được xác định ở các mục trước
vào, ta thu được khai triển tường minh của ma trận cục bộ i	A :
sin( )cos( )
si 	)
1 	0 	0 	0
0 	1 	0 	0
0 	0 	1
n(
cos( ) c
0
0
s
0
o ( )	0
i
iz iy
iz 	ix
iy i
i 	i
i
i 	i	x
A r r
r 	r
r r
 	

 	
 	
 	
 	
 	
  	
	 	
 		
 	
	 	

	
Khác với cấu trúc quadrotor cố định, các tham số cánh tay đòn dọc trục Z  		iz	r và góc
servo i	
 , i	
 trong cấu hình Tilt-rotor 2 trục liên tục biến thiên. Do đó, toàn bộ ma trận
 		,	A
  phải được vi điều khiển cập nhật lại theo thời gian thực tại mỗi chu kỳ lấy mẫu
để thuật toán phân bổ tối ưu (Control Allocation) giải ra nghiệm chính xác.
Lưu ý về mặt thực thi: Để tránh hiện tượng trễ pha (phase lag) do đặc tính đáp ứng chậm
của servo vật lý, các biến
 ,
 dùng để cập nhật ma trận A trong Firmware phải là
góc mong muốn (Desired Angles - des	
 ) do thuật toán xuất ra, thay vì góc đo được từ
cảm biến phản hồi của servo. Việc xử lý triệt để độ trễ này sẽ được phân tích ở Mục
VII.
4. Động lực học và Không gian trạng thái
Để thiết lập phương trình không gian trạng thái hoàn chỉnh, cần phân tích chi tiết tất cả
các vector lực và momen tác động lên trọng tâm UAV trong quá trình bay. Phương trình
tổng quát theo định luật Newton-Euler được cấu thành từ 4 thành phần ngoại lực chính.
4.1. Lực và Momen từ Hệ thống Đẩy
Đây là thành phần lực duy nhất mà bộ điều khiển có thể can thiệp. Lực và momen chủ
động tác động lên thân máy bay (trong hệ B	F ) chính là nghiệm của bài toán ánh xạ từ
không gian 16 đầu vào:

-- 20 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 22
 		,
B
control
cmd 	total	B
control
F A 	u
M

	 
 	  		 	
 		 	
Triển khai cụ thể theo 4 nhánh, vector lực tịnh tiến và momen tư thế thực tế sinh ra là:

4 	4
1 	1
ix
B
control 	i 	iy
i 	i
iz
F
F 	F 	F
F
 	
 
  	  
 	 
 	
 	 	
4 	4
, 	,
1 	1
B
control 	total i i 	coax i
i 	i
M 	r 	F 	M
 	
 	 	 	
Tính nhất quán của Momen Coaxial  		,	coax i	M 	:
Với cấu hình động cơ đồng trục quay ngược chiều, momen phản lực ròng của cụm động
cơ thứ i được mô hình hóa bởi sự chênh lệch tốc độ quay:
 	2 	2
, 	, 	,	coax i i Q upper i 	lower i zi	M 	S K 	e	
	 	 	 
(Trong đó
 là hệ số suy giảm hiệu suất khí động của cánh dưới, zi	e là vector định
hướng không gian của trục động cơ).
4.2. Trọng lực
Trọng lực tác dụng tại trọng tâm, luôn hướng theo trục E	Z	 của hệ quán tính. Khi chiếu
sang hệ tọa độ Thân B	F thông qua ma trận quay  	T	E
B	R , vector trọng lực liên tục thay
đổi theo tư thế góc Euler 	 		, , T
   	 	của UAV:
 	
0 	sin
0 	cos sin
cos cos
T	B 	E
gravity 	B	F 	R 	mg
mg

 
 
	  	 	
  	 	 	  	 	
  	 		  	 	
4.3. Lực cản khí động học
Lực cản tác động lên thân máy bay tỷ lệ với vận tốc bay. Mô hình đơn giản hóa sử dụng
ma trận hệ số cản tuyến tính (hoặc bậc hai ở tốc độ cao):

-- 21 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 23
B
drag	F 	D
 	 
Trong đó:
 B
drag	F : Vector lực cản khí động tác dụng lên thân máy bay, biểu diễn trong hệ tọa
độ Thân (Body Frame).
 	 		, ,	u v w	D diag d d d	
  	: Ma trận hệ số cản tịnh tiến.
 	 		, , T
u v w	
  	: Vector vận tốc tịnh tiến trong hệ B
Momen cản quay (Rotational Drag) chống lại chuyển động quay của thân:
B
drag	M 	D
 	 
Trong đó:
 B
drag	M : Vector lực cản khí động tác dụng lên thân máy bay, biểu diễn trong hệ
tọa độ Thân (Body Frame).
 	 		, ,	p q r	D diag d d d	
  	: Ma trận hệ số cản quay.
 	 		, , T
p q r	
  	: Vector vận tốc góc trong hệ B.
4.4. Hiệu ứng Gyroscopic
OVAP-X1 sở hữu 8 đĩa cánh quạt quay ở tốc độ rất cao i	 . Khi thân máy bay hoặc các
cánh tay thực hiện chuyển động xoay (vận tốc góc
 ), hiệu ứng hồi chuyển (Gyroscopic
Effect) sẽ sinh ra momen lật có xu hướng bẻ lệch tư thế UAV.
 		 	
8
,
1
gyro prop 	prop 	i zi
i
M 	J 	e	


 	 	
Trong đó:
 	,	gyro prop	M 	: Momen Gyro tổng.
 	prop	J : Momen quán tính cánh.
	
 : Vận tốc góc thân.

-- 22 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 24
 	i	 : Tốc độ động cơ.
 zi	e : Vector chỉ hướng trục quay của động cơ trong hệ toạ độ thân.
Xác định vector định hướng trục quay zi	e :
Để tính toán chính xác momen Gyro, việc xác định vector định hướng không gian của
trục động cơ zi	e tại mỗi chu kỳ lấy mẫu là bắt buộc. Hệ thống đề xuất hai phương pháp
tiếp cận tùy thuộc vào môi trường triển khai:
 Phương pháp 1: Tính toán từ Góc Servo (Dành cho Lý thuyết & Mô phỏng)
Dựa trên ma trận quay tổng hợp của chuỗi động học Tilt-Rotor (Servo Thân i	

quay quanh trục Y, Servo Tay i	
 quay quanh trục X), vector zi	e là kết quả của
việc chiếu vector đơn vị trục Z cục bộ  		0,0,1 T
qua chuỗi ma trận quay:
 	 	 	
0
0
1
y	zi 	i x i	e R 	R	
	

 


   
 
 Phương pháp 2: Chiết xuất từ Vector Lực (Tối ưu hóa cho Code Firmware)
Để tiết kiệm chu kỳ máy trên vi điều khiển, thuật toán bỏ qua các phép tính lượng
giác cồng kềnh bằng cách tận dụng trực tiếp kết quả vector lực tịnh tiến
, , T
i 	ix iy iz	F F F F	 		  	 đã được tính ở khối Phân bổ lực (Control Allocation).
Do lực đẩy sinh ra luôn có hướng vút lên trên (ngược chiều với trục động cơ
hướng xuống), vector zi	e được nội suy cực kỳ nhanh chóng bằng phép chuẩn
hóa vector lực có gắn dấu âm:
1 ix
i
zi 	iy
i 	i
iz
F
F
e 	F
F 	T F
 
   	   
 	 
(Lưu ý: i	T là độ lớn lực đẩy tổng hợp  	2 	2 	2
ix iy iz	F F F	  	)
Áp dụng Quy tắc bàn tay phải cho Momen Gyro:
Do mỗi cụm nhánh sử dụng động cơ đồng trục quay ngược chiều nhau, vector vận tốc
góc thực tế của từng động cơ  phải được xác định dấu dựa trên chiều quay vật lý so

-- 23 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 25
với trục zi	e (hướng xuống):
 Đối với động cơ quay CW (Cùng chiều kim đồng hồ): Theo quy tắc bàn tay phải,
vector vận tốc góc hướng xuống, cùng chiều với trục động cơ. Do đó ta sử dụng:
zi	e	 .
 Đối với động cơ quay CCW (Ngược chiều kim đồng hồ): Vector vận tốc góc
hướng lên, ngược chiều với trục động cơ. Do đó ta sử dụng: zi	e	 .
Nhận xét về Ưu điểm Động học của Cấu hình Đồng trục:
Trong các hệ thống Tilt-rotor đơn cánh quạt, khi Servo bẻ ngàm với tốc độ góc servo	

lớn, momen hồi chuyển gyro	M sinh ra là rất đáng kể, gây tải vặn xoắn nặng nề lên trục
cơ khí của Servo. Tuy nhiên, ở cấu hình OVAP-X1 Coaxial X8, tại mỗi cụm nhánh, hai
đĩa cánh quạt quay ngược chiều nhau  		upper 	lower	 	  	. Hệ quả là tổng động lượng
góc của hệ thống rotor tại mỗi nhánh gần như bị triệt tiêu. Do đó, 	, 	0	gyro barnch	M 	 , giúp
triệt tiêu hoàn toàn nhiễu động học phi tuyến lên ngàm Servo, làm tăng tuổi thọ phần
cứng và cho phép các bộ điều khiển tối ưu hóa và phân bổ lực hoạt động chính xác hơn.
4.5. Động lực học
4.5.1. Động lực học Tịnh tiến
Áp dụng định luật II Newton trong hệ quy chiếu không quán tính (Body Frame), ta tính
đến lực quán tính Coriolis:
 	 B 	B 	B
control gravity drag	m 	F 	F 	F	
  	   	 		
Khai triển tường minh cho vector gia tốc tịnh tiến 	 		, , T
u v w	
 	    :
sin
1 	1
cos sin
cos cos
B
control
u 	qw rv 	u
v 	F 	g 	ru pw 	D v
m 	m
w 	pv qu 	w


	
 
 
 		  	 	  	 	 
  	 	  	 	  	 	 	 	  	 	  	 	 
  	 	  	 	 		  	 	  	 	 



Trong đó B
control	F 	là 3 hàng đầu tiên của vector lệnh 	 		,	cmd 	total	A 	u	

	 	 	.
4.5.2. Động lực học Quay

-- 24 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 26
Phương trình Euler cho chuyển động quay quanh trọng tâm:
 	 B 	B
control 	gyro 	drag	J 	J 	M 	M 	M	
  		  	 	 		
Trong đó 	 		, ,	xx yy zz	J diag J J J	 	là tensor quán tính (giả sử đối xứng qua các mặt phẳng
chính của khung Rectangular X). Khai triển tường minh cho gia tốc góc 	 		, , T
p q r	
 	    :
 		 	
 		 	
 		 	
 	1
1
1
1
x 	yy zz
xx
B 	B
y 	zz xx 	gyro 	drag
yy
z 	xx yy
zz
M 	J J qr
J
p
q 	M 	J J pr 	J M 	M
J
r
M 	J J pq
J

 	
 		 	
 	   	   	 	 	 		 	   	 	   	
 		 	
 		 	



Với 	, , T
x y z	M M M	 	 	 là 3 hàng cuối của vector 	 		,	cmd 	total	A 	u	

	 	 	.
4.6. Mô hình không gian trạng thái
Tổng hợp lại toàn bộ các phương trình Động học và Động lực học, ta có mô hình phi
tuyến đầy đủ của hệ thống UAV 6-DOF dưới dạng 	 		,	x f x u		 	.
Hệ thống được xác định bởi vector trạng thái 12 chiều 12
x   :
 		, , , , , , , , , , , T
x x y z u v w 	p q r	
  	
Đầu vào của hệ phương trình trạng thái là vector lệnh lực/momen tác động lên thân
6
, , , , , T
cmd 	x y z x y z	F F F M M M	
 	 		 	 	  .
Khai triển tường minh hệ phương trình vi phân 12 thành phần (đã bao gồm Lực cản khí
động và Hiệu ứng hồi chuyển Gyroscopic) như sau:

-- 25 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 27
 	 	 	 	 	
 	 	 	 	 	
 	 	 	 	 	
 	 	 	
 	 	 	
cos cos 	sin sin cos 	cos sin 	cos sin cos 	sin sin
cos sin 	sin sin sin 	cos cos 	cos sin sin 	sin sin
sin 	sin cos 	cos cos
1
sin
1
cos sin
x 	u
y 	v
x 	u 	v 	w
y 	u 	v 	w
z 	u 	v 	w
u rv qw g 	F D u
m
v pw ru g 	F D v
m
w
 
	   	 
	   	 
 
	   	 
	   	 

	 
	 

	
 
	
 	 	 	 	
 	 	 	 	
  	 	
  	 	 	
 	  	 	






  	 	 	
 	
 	
 	
 	
 	
,
,
,
1
cos cos
sin 	cos tan
cos 	sin
sin 	cos / cos
1
1
1
z 	w
yy zz
x 	gyro x 	p
xx 	xx
zz xx
y 	gyro y 	q
yy 	yy
xx yy
z 	gyro z 	r
zz 	zz
qu pv g 	F D w
m
p q 	r
q 	r
q 	r
J J
p 	qr 	M M 	D p
J 	J
J J
q 	pr 	M M 	D q
J 	J
J J
r 	pq 	M M 	D r
J 	J
 
	

	 	 	

	 	

	 	 	













  	 	 		

 	  	
  	
 	

 	 	 	

 	 	 	

 	 	 	



















II. THIẾT KẾ BỘ PHÂN BỔ GIẢI TÍCH ĐƠN GIẢN
Với mô hình không gian trạng thái 12 chiều và ma trận phân phối lực phi tuyến phức
tạp đã thiết lập ở Phần I, việc tính toán trực tiếp nghịch đảo ma trận trên vi điều khiển
ở Giai đoạn 1 là không khả thi do giới hạn phần cứng. Do đó, phần này đề xuất kiến
trúc phần mềm và thuật toán phân bổ giải tích đơn giản hóa, sử dụng xấp xỉ tĩnh để điều
khiển hệ thống.
1. Kiến trúc phần mềm và Luồng điều khiển
Để hiện thực hóa mô hình toán học và kiểm soát hệ thống phần cứng phức tạp của
OVAP-X1, kiến trúc phần mềm của Giai đoạn 1 được thiết kế theo nguyên tắc module
hóa (Modular Design). Hệ thống tách biệt rõ ràng khối tạo quỹ đạo, khối điều khiển
PID và khối phân bổ vật lý, giúp quá trình gỡ lỗi (debugging) hiện tượng nhiễu chéo trở
nên minh bạch.
1.1. Tư duy thiết kế "Nguồn chân lý duy nhất" (Single Source of Truth)
Trong một hệ thống dư cơ cấu chấp hành với 16 đầu vào điều khiển , việc rải rác các

-- 26 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 28
thông số phần cứng (như tọa độ cánh tay đòn, ID động cơ, chiều quay thuận/nghịch)
vào nhiều file mã nguồn khác nhau là một thiết kế tiềm ẩn rủi ro cực lớn. Chỉ cần một
sai sót nhỏ trong việc khai báo nhầm dấu (sign) của Momen nội tại hoặc nhầm ID động
cơ Dưới/Trên, hệ thống sẽ lập tức sinh ra nhiễu chéo (cross-coupling) làm máy bay mất
kiểm soát.
Để giải quyết triệt để vấn đề này, kiến trúc phần mềm áp dụng triết lý "Nguồn chân lý
duy nhất" (Single Source of Truth - SSoT) thông qua việc thiết lập một Bảng ánh xạ
phần cứng (Hardware Mapping Table) tập trung.
Bảng này là một ma trận đa hướng  		4 8	 , đóng vai trò như "DNA" của toàn bộ hệ
thống, chứa các trường thông tin:
1. Arm ID: Số thứ tự cụm nhánh (1: Trước-Phải, 2: Sau-Trái, 3: Trước-Trái, 4: Sau-
Phải).
2. Tọa độ Không gian  		,	X Y : Khoảng cách hình học tính từ khối tâm (CoG).
3. Chỉ số Động cơ (Top/Bot Index): Ánh xạ ID chuẩn của PX4 cho động cơ Trên
và Dưới.
4. Chiều quay (Direction): Quy ước hệ số  		i	S chiều quay cơ khí của motor Trên
(1: CCW, -1: CW) và tự động suy ra motor Dưới luôn quay ngược lại.
5. Chiều bẻ Servo  		,	
  : Bù trừ hướng lắp đặt hình học (đối xứng gương) của
Servo.
Lợi ích: Bất kỳ module nào trong hệ thống (từ bộ Điều khiển, bộ Phân bổ Mixer, đến
Mô hình Vật lý Plant) khi cần thông số phần cứng đều phải trích xuất tự động từ bảng
này. Thiết kế này giúp quản lý rủi ro tuyệt đối và mở ra khả năng dễ dàng nâng cấp cấu
hình lên Hexa-Tilt (6 nhánh) hoặc Octo-Tilt (8 nhánh) trong tương lai chỉ bằng cách
thêm hàng vào ma trận mà không cần viết lại thuật toán.
1.2. Sơ đồ luồng tín hiệu (Signal Flow)
Luồng tín hiệu của Phiên bản V1 được thiết kế theo cấu trúc điều khiển bay kinh điển,

-- 27 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 29
nhưng được nâng cấp ở khâu tiền xử lý (Planner) và hậu xử lý (Mixer).
Luồng điều khiển được mô tả qua các khâu sau:
1. Lệnh Mục tiêu (Target Command): Tín hiệu đầu vào từ hệ thống dẫn đường (Vị
trí X, Y, Z hoặc Góc tư thế mong muốn).
2. Bộ Tạo Quỹ đạo Nhận thức Cơ cấu (Actuator-Aware Trajectory Planner): Để
tránh hiện tượng tín hiệu điều khiển bị gắt làm hệ thống cơ khí (Servo) bị bão
hòa và trễ pha, module này đọc các giới hạn tốc độ cơ khí từ Bảng ánh xạ phần
cứng. Sau đó, nó áp dụng bộ lọc giới hạn gia tốc và vận tốc để làm mềm tín hiệu
mục tiêu, sinh ra Setpoint mượt mà.
3. Bộ Điều khiển PID Vòng xoắn (Cascade PID Controller): Hệ thống sử dụng bộ
điều khiển PID phân lớp:
 Vòng ngoài (Outer Loop): Tính toán sai số vị trí/vận tốc để xuất ra góc tư
thế (Roll/Pitch mong muốn).
 Vòng trong (Inner Loop): Tính toán sai số góc và tốc độ góc, từ đó xuất
ra 4 biến nỗ lực điều khiển rời rạc (Effort variables): Lực nâng cơ sở, Nỗ
lực lật dọc, Nỗ lực lật ngang và Nỗ lực xoay mũi.
4. Bộ Phân bổ Giải tích (Analytical Allocation): Đây là "khối não" của Version 1.
Nó tiếp nhận 4 biến nỗ lực rời rạc từ bộ PID. Dựa vào tọa độ tĩnh  		,	x 	y	pos pos
trích xuất từ Bảng ánh xạ phần cứng, nó dùng các phép cộng/trừ đại số tuyến
tính để tính ra tổng lực cần thiết cho từng cụm nhánh arm	T . Sau đó, áp dụng thuật
toán R-CRM để phân rã chính xác lực này thành lệnh tốc độ riêng biệt cho động
cơ Trên top	T và động cơ Dưới bot	T .
5. Mô hình Vật lý (6-DOF Simscape Plant): Môi trường mô phỏng tiếp nhận các
tín hiệu cơ khí đã được phân rã, tính toán động lực học Newton-Euler (bao gồm
hiệu ứng hồi chuyển Gyro, lực cản khí động và sự hao hụt đồng trục) để cập nhật
trạng thái mới của máy bay, sau đó phản hồi (feedback) lại bộ PID.

-- 28 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 30
2. Thuật toán phân bổ tĩnh
Dựa trên hệ phương trình trạng thái phi tuyến 12 thành phần và ma trận phân phối lực
 		,	A
  quy mô  		6 16	 	đã được thiết lập tại tài liệu Mô hình Toán học Cơ sở (Core
Model), Giai đoạn 1 chưa tiến hành giải trực tiếp ma trận biến thiên này. Thay vào đó,
hệ thống áp dụng phương pháp xấp xỉ tĩnh. Phương pháp giải tích này giả định các ngàm
Servo hoạt động quanh điểm cân bằng để rút ra các quy tắc cộng trừ đại số, giúp giảm
tải tính toán tối đa cho vi điều khiển.
2.1. Tính toán Góc ngàm Servo và Giải trừ liên kết tư thế
Để hệ thống có thể thực hiện chuyển động tịnh tiến độc lập mà không ảnh hưởng đến
tư thế thân máy bay, thuật toán tính toán góc bẻ Servo dựa trên vector gia tốc mong
muốn:
 Đồng bộ hệ tọa độ (Heading Alignment): Vector gia tốc tịnh tiến từ hệ quy chiếu
Trái Đất được xoay theo góc Yaw hiện tại của máy bay để quy đổi về hệ trục
ngang của hệ Thân.
 Nội suy góc bẻ cơ sở: Góc nghiêng lý tưởng của Servo được xác định thông qua
hàm lượng giác ngược của tỷ lệ giữa vector gia tốc ngang và gia tốc trọng trường:
arcsin x
base
a
g
  
 	 
  và 	arcsin y
base
a
g
  
 	 
 
 Giải trừ liên kết tư thế: Khi thân máy bay bị nghiêng một góc Pitch  		
 hoặc
Roll  		
 , phương của vector lực đẩy sẽ bị lệch đi so với phương thẳng đứng ban
đầu. Thuật toán áp dụng cơ chế bù trừ đại số trực tiếp dựa trên hệ quy chiếu
chuẩn hàng không FRD (Forward-Right-Down).
Trong hệ FRD, góc ngóc mũi lên (Pitch Up) mang giá trị dương. Để giữ vector
lực hướng thẳng xuống đất, Servo bắt buộc phải gập về phía trước (chiều âm).
Do đó, phương trình góc bẻ lệnh  		,	cmd cmd	
  	được tính như sau:
cmd base	
 	 		 	

-- 29 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 31
cmd base	
 	 		 	
Các phép trừ trực tiếp giá trị Pitch/Roll  		,	
  từ cảm biến IMU này được thực
hiện liên tục tại mỗi chu kỳ (400Hz). Về mặt bản chất, đây chính là sự cụ thể hóa
của phép đảo ngược vector định hướng không gian  		,	dir i	v	 	được định nghĩa
trong Core Model, nhằm mục đích neo giữ vector lực đẩy tổng hợp luôn chĩa
thẳng xuống trục E	Z của hệ quán tính.
2.2. Bù trừ Lực nâng và Tổng hợp Lực Cánh tay đòn
Khi các cụm Servo bẻ góc, thành phần lực đẩy chiếu lên trục thẳng đứng Z sẽ bị suy
giảm, gây ra hiện tượng mất độ cao. Thuật toán khắc phục triệt để vấn đề này thông qua
khâu bù trừ lực nâng:
1. Bù trừ suy hao hình học: Tổng lực nâng cơ sở  		base	T 	được tỷ lệ nghịch với cosin
của góc Servo thực tế. Nghĩa là, góc bẻ càng lớn, hệ thống càng tự động tăng
công suất tổng để duy trì đủ thành phần lực đẩy theo phương thẳng đứng:
 	 	 	
,
4 cos 	cos
z req
base
fb 	fb
F
T

	
 
2. Phân bổ momen lật: Các momen điều khiển lật dọc (Pitch) và lật ngang (Roll)
được quy đổi thành sự chênh lệch lực đẩy tại các nhánh. Dựa trên khoảng cách
hình học tĩnh từ khối tâm đến các ngàm xoay, thuật toán sử dụng hàm xét dấu
tọa độ không gian để tự động quyết định nhánh nào cần tăng lực, nhánh nào cần
giảm lực.
 		, 4
x
roll i 	i
i
M
T 	sign y
y
 	 	
 		, 4
y
pitch i 	i
i
M
T 	sign x
x
 	 	
3. Tổng hợp lực: Tổng lực đẩy yêu cầu tại đầu cánh tay đòn thứ  		,	arm i	i T 	là tổng
đại số của lực nâng cơ sở và các thành phần lực bù trừ momen lật tương ứng tại

-- 30 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 32
nhánh đó.
, 	, 	,	arm i base 	pitch i 	roll i	T 	T 	T 	T	 	  	 
2.3. Thuật toán Trộn Đồng trục
Đây là phân hệ cốt lõi giải quyết bản chất phi lý tưởng của hệ thống khí động học đồng
trục. Khác với các bộ trộn đa rotor thông thường chỉ đơn thuần chia đều tín hiệu, R-
CRM thực hiện nội suy giải tích để bù đắp chính xác hệ số suy giảm lực đẩy  		c	
 và hệ
số suy giảm momen  		c	
 của cánh dưới do luồng xả nhiễu động.
a. Thiết lập hệ phương trình Lực và Momen
Tại mỗi cụm nhánh i , tổng lực nâng yêu cầu  		,	arm i	T 	và lượng momen Yaw mong
muốn (đã được quy đổi thành lực tương đương  		yaw	T	 	được tạo ra bởi sự phối
hợp của động cơ Trên  		top	T và động cơ Dưới  		bot	T . Mối quan hệ vật lý này
được mô hình hóa bằng hệ phương trình đại số bậc nhất 2 ẩn:
(1) Phương trình Cân bằng Lực đẩy:
,	arm i top c bottom	T 	T 	T	
	 	
(Ý nghĩa: Tổng lực đẩy hữu ích là tổng của lực đẩy động cơ trên và lực đẩy
đã bị suy hao của động cơ dưới).
(2) Phương trình Cân bằng Momen (Lực chênh lệch):
top c bottom	yaw T	T 	T	
		 	
(Ý nghĩa: Momen xoay mũi được sinh ra do sự chênh lệch lực đẩy giữa hai động
cơ quay ngược chiều, trong đó momen phản lực của cánh dưới bị suy giảm theo
hệ số c	
 ).
b. Phân rã lực đẩy đồng trục (Nội suy giải tích)
Thay vì sử dụng các thuật toán xấp xỉ hay PID phản hồi vòng ngoài (dễ gây trễ

-- 31 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 33
pha), thuật toán R-CRM tiến hành giải trực tiếp hệ phương trình (1) và (2) bằng
phương pháp thế. Bằng cách lấy (1) trừ (2), ta triệt tiêu được ẩn top	T và tìm ra
nghiệm chính xác tuyệt đối cho từng động cơ tại mỗi chu kỳ lấy mẫu:
(1) Tốc độ (Lực) yêu cầu cho động cơ Dưới:
,	arm i 	yaw
bottom
c c
T 	T
T
 
 
 
(2) Tốc độ (Lực) yêu cầu cho động cơ Trên:
Sau khi có bottom	T , thuật toán thế ngược lại vào phương trình (1) để nội suy
động cơ trên:
,	top arm i c bottom	T 	T 	T	
	 	 
Tính mới và ưu điểm: Việc chuyển đổi một bài toán phi tuyến khí động học
thành một hệ phương trình đại số tuyến tính có nghiệm đóng (closed-form
solution) giúp vi điều khiển tính toán cực kỳ nhanh chóng. Khâu R-CRM này
đảm bảo momen xoắn dư thừa luôn bị triệt tiêu hoàn toàn ngay từ tầng cơ cấu
chấp hành mà không cần chờ bộ điều khiển PID bù trừ, giúp UAV không bị
trôi Yaw khi tăng giảm độ cao.
c. Xử lý bão hòa cơ cấu chấp hành (Saturation Handling)
Động cơ BLDC không thể sinh lực đẩy âm. Tuy nhiên, khi lệnh xoay Yaw  		yaw	T	
quá lớn, nghiệm đại số có thể trả về giá trị âm. Để hệ thống không bị lỗi, ta bổ sung
nguyên lý xử lý ngoại lệ ngay sau khi giải hệ phương trình:
 Ghim giới hạn: Nếu tính toán ra 	0	bottom	T 	 hoặc 	0	top	T  , biến nỗ lực của động
cơ đó lập tức bị gán bằng 0.
 Tính toán bù trừ: Động cơ cùng nhánh còn lại sẽ được tính lại dựa trên phương
trình (1) để gánh toàn bộ lực nâng yêu cầu.
Cách xử lý bằng phần mềm này giúp hệ thống luôn ưu tiên duy trì lực nâng để giữ

-- 32 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 34
cao độ (không bị rớt), chấp nhận hy sinh một phần momen xoay Yaw trong chớp
mắt khi gặp lệnh quá gắt.
III. 	CHỨNG MINH KHẢ NĂNG HOẠT ĐỘNG
1. 	Môi trường kiểm thử
Để xác thực tính đúng đắn của bộ Phân bổ Điều khiển Giải tích (Giai đoạn 1), hệ thống
được đưa vào môi trường mô phỏng vật lý đa vật thể (Simulink/Simscape Multibody).
Môi trường này cung cấp mô hình 6-DOF phi tuyến đầy đủ, bao gồm lực cản khí động
học, quán tính khối lượng của các cơ cấu cơ khí và hiệu ứng hồi chuyển (Gyroscopic
effect) của đĩa cánh quạt.
Kịch bản kiểm thử tập trung vào khả năng duy trì trạng thái lơ lửng (Hovering) và đáp
ứng bước (Step Response) đối với các lệnh thay đổi tư thế (Roll/Pitch/Yaw) độc lập,
nhằm đánh giá khả năng giải trừ liên kết (Decoupling) của hệ thống.
2. 	Kết quả mô phỏng
Để minh chứng cho tính hiệu quả của bộ Phân bổ Điều khiển Giải tích (Analytical
Allocation) và thuật toán R-CRM, hệ thống OVAP-X1 Giai đoạn 1 đã được thử nghiệm
đối chiếu song song giữa hai môi trường: Mô hình Toán học (MATLAB Scripts) và Mô
hình Vật lý phi tuyến đa vật thể (Simulink/Simscape Multibody). Các tiêu chí đánh giá
tập trung vào khả năng giải trừ liên kết 6-DOF, độ ổn định của logic điều khiển cơ bản
và tính đồng nhất giữa hai môi trường.
2.1. 	Kết quả mô phỏng trạng thái giữ vị trí
Nội dung phân tích: Để duy trì trạng thái lơ lửng cho khối lượng 2.6kg, thuật toán R-
CRM thực hiện phân bổ bù trừ hao hụt. Dữ liệu cho thấy motor dưới (đường nét đứt)
phải chạy ở mức 3.64N, cao hơn đáng kể so với motor trên (3.27N). Sự chênh lệch này
giúp bù đắp chính xác 15% hiệu suất bị mất do luồng gió xả nhiễu động, đảm bảo tổng

-- 33 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 35
lực nâng hiệu dụng đạt đúng mục tiêu mà máy bay không bị chìm cao độ.
2.2. 	Kiểm chứng chéo mô hình: Toán học vs. Vật lý (Scripts vs. Simscape)
Thành công lớn nhất của Giai đoạn 1 là việc chứng minh các logic toán học giải tích
đơn giản hoàn toàn có khả năng kiểm soát một hệ thống phi tuyến phức tạp.
 	Sự tương đồng: Kết quả mô phỏng cho thấy đáp ứng quỹ đạo từ bộ tính toán
động học (Scripts) khớp với mô hình mô phỏng vật lý đa vật thể (Simscape). Các
hiệu ứng phức tạp như lực cản khí động, quán tính Servo, và đặc biệt là sự hao
hụt hiệu suất của cánh quạt đồng trục 	 		,	c 	c	
 	 	đã được bù trừ hoàn hảo chỉ bằng
các phương trình đại số lượng giác tuyến tính.
 	Tính hiệu quả của Logic đơn giản: Việc phân rã lực và momen bằng phương
pháp tĩnh (sử dụng tọa độ hình học tĩnh và bù trừ chéo) đã giúp hệ thống hoạt
động. Nó chứng minh rằng, đối với cấu hình OVAP-X1, ta chưa cần phải dùng
đến các thuật toán tối ưu hóa ma trận nặng nề để có thể giữ cho máy bay lơ lửng
và bám quỹ đạo ổn định.

-- 34 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 36
(Đáp ứng từ Scripts)

-- 35 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 37

-- 36 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 38
(Đáp ứng từ Simulink Simscape)
2.3. 	Kịch bản Tịnh tiến Độc lập: Tách biệt hoàn toàn Vị trí và Tư thế (Decoupling
6-DOF)
Để kiểm chứng khả năng tách biệt 6 bậc tự do mang tính cách mạng của cấu hình Tilt-
Rotor Coaxial, một kịch bản đặc biệt đã được thiết lập: Yêu cầu UAV di chuyển tịnh
tiến tiến về phía trước (Trục X) một quãng đường 10m, đồng thời duy trì góc ngóc đầu
(Pitch) ở mức dương (+10 độ).
 	Sự khác biệt với UAV truyền thống: Đối với một chiếc Quadcopter hoặc
Multirotor tiêu chuẩn (Under-actuated), để bay về phía trước, hệ thống bắt buộc
phải chúi mũi xuống (góc Pitch âm) nhằm hướng vector lực đẩy ra phía sau. Việc
vừa ngóc đầu lên (Pitch dương) vừa bay tới là điều bất khả thi về mặt động lực
học.
 	Kết quả trên OVAP-X1: Hệ thống đã thực hiện kịch bản này một cách hoàn hảo.
Bộ Phân bổ Giải tích tự động bù trừ tư thế: Khung thân UAV ngóc lên +10 độ,
nhưng 4 cụm Servo nhánh lập tức bẻ một góc lớn hơn về phía trước. Kết quả là
vector lực đẩy tổng hợp vẫn hướng chéo về phía sau, đẩy UAV tiến lên mượt mà
dọc theo trục X, trong khi thân máy bay vẫn giữ nguyên tư thế ngóc đầu ổn định.

-- 37 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 39
 	Đánh giá: Kịch bản này cung cấp bằng chứng thép cho việc OVAP-X1 đã phá
vỡ hoàn toàn ràng buộc động học truyền thống. Sự thay đổi tư thế (Attitude) và
chuyển động tịnh tiến (Translation) đã được giải trừ liên kết (Decoupled), mở ra
tiềm năng to lớn cho các nhiệm vụ mang vác cảm biến cần giữ góc nhìn cố định
khi di chuyển.

-- 38 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 40
(Đáp ứng từ Scripts)

-- 39 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 41
(Đáp ứng từ Simulink Simscape)
IV. 	TỔNG HỢP HẠN CHẾ VÀ ĐỊNH HƯỚNG VERSION 2
1. 	Vấn đề: Hiện tượng trôi dạt tọa độ (Drift) và Điểm kỳ dị động học
(Singularity) ở góc nghiêng lớn
1.1. 	Mô tả vấn đề mở rộng
Trong các thử nghiệm đáp ứng bước ban đầu, hệ thống ghi nhận hiện tượng trôi dạt
(Drift) trên trục tịnh tiến X và sự nhầm lẫn lệnh (lệnh Pitch bị chuyển hóa thành chuyển

-- 40 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 42
động xoay mũi Yaw).
Tuy nhiên, khi thực hiện các kịch bản bay siêu linh hoạt với góc bẻ ngàm Servo tiệm
cận mức cực đại 	 		75	
 	 	, hệ thống xuất hiện một vấn đề nghiêm trọng hơn: Sự mất ổn
định động học toàn phần. Từ góc 	75 , hệ thống xuất hiện dao động Yaw và đập nhả lực
đẩy (Thrust) với tần số cao. Khi đạt tới ngưỡng 	80 	85	 	 , quỹ đạo xác lập (steady-
state) hoàn toàn bị phá vỡ, bộ điều khiển PID rơi vào trạng thái bão hòa khiến UAV mất
kiểm soát hoàn toàn.
1.2. 	Nguyên nhân gốc rễ
Hiện tượng này xuất phát từ hai sai lệch mang tính hệ thống trong giai đoạn đầu phát
triển, kết hợp với một rào cản vật lý cốt lõi:
 	Nguyên nhân 1: Sai lệch ánh xạ phần cứng ban đầu. Việc cấp nhầm thứ tự ID
động cơ Trên/Dưới hoặc gán sai quy ước chiều quay (Thuận/Nghịch kim đồng
hồ) giữa mô hình toán học và mô hình vật lý Simscape đã tạo ra các momen
ngược chiều. (Vấn đề này đã được khắc phục triệt để bằng việc chuẩn hóa bảng
ánh xạ phần cứng).
 	Nguyên nhân 2: Nhiễu chéo Động lực học và Điểm kỳ dị. Đây là nguyên nhân
cốt lõi gây sụp đổ hệ thống ở góc lớn. Đối với cấu hình Tilt-Rotor, khi ngàm
Servo bẻ một góc nghiêng 	 		90	
 	  (Ví dụ: 	80	
 	  ), vector lực đẩy 	i	T 	của
động cơ gần như nằm ngang hoàn toàn so với khung thân (Body Frame).

-- 41 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 	Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 43
Chứng minh toán học sự sụp đổ của hệ thống:
o 	Suy giảm quyền điều khiển: 	Lực nâng hữu ích dọc trục Z để tạo momen
Pitch 	y	M 	bị suy giảm theo hàm cosin: 	 		sin 80 	0.17	z 	i 	i	F 	T 	T	 	 	 . Tức là,
khả năng điều khiển Pitch bị mất tới 	83% 	.
o 	Nhiễu chéo Yaw: 	Chênh lệch lực đẩy 	front 	rear	T 	T	 	vốn dùng để tạo Pitch
nay lại đâm ngang thân máy bay, sinh ra lực 	 		sin 80	y 	i	F 	T	  , từ đó tạo ra
momen Yaw 	 		z	M 	phá hoại cực lớn.
o 	Tỷ 	lệ 	giữa 	Momen 	Yaw 	nhiễu 	và 	Momen 	Pitch 	điều 	khiển 	là
 	
 	  	
sin 80 tan 80 	5.67
cos 80  	


 . Nghĩa là cứ bộ điều khiển xuất ra 1 đơn vị
lực để gồng Pitch, kết cấu vật lý lại tự sinh ra 5.67 đơn vị lực quăng đuôi
(Yaw) ngoài ý muốn.
o 	Trong khi đó, khả năng tạo momen Yaw nội tại của cụm đồng trục để
chống lại sự phá hoại này cũng bị vô hiệu hóa do trục motor đã nằm ngang
(suy giảm 	83% 	sức mạnh).
1.3. 	Đánh giá Giải pháp Bù trừ Tuyến tính hiện tại
Để khắc phục, một hệ số bù chéo tĩnh 	 		_ 	_ 	, 	_ 	_	K 	cross 	roll K 	cross 	pitch 	đã được bổ
sung vào bộ Phân bổ Giải tích nhằm chủ động giảm tải lệnh Roll/Pitch dựa trên hàm

-- 42 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 44
 		sin
 .
 Kết quả: Giải pháp này hoạt động hiệu quả ở dải góc vừa phải  		75	  , giúp
giảm biên độ lệnh, từ đó triệt tiêu dao động Thrust và đưa hệ thống về trạng thái
xác lập ổn định (sai số 0.5	  ).
 Giới hạn: Tuy nhiên, ở góc  		75	  , hệ số bù tĩnh này hoàn toàn thất bại. Lý do
là bộ bù tĩnh không thể đối phó với sự thay đổi động lực học tần số cao của bộ
PID trong vùng điểm kỳ dị, nơi mà tỷ lệ nhiễu chéo  		80 vượt quá sức chịu
đựng của một bộ trộn tuyến tính đại số đơn giản.
2. Hạn chế của phương pháp Giải tích
 Mặc dù phương pháp giải tích cung cấp nghiệm tính toán nhanh và ổn định, nó
vẫn tồn tại những giới hạn bản chất khi đối mặt với một hệ thống 16 đầu vào:
 Hạn chế về Động lực học cánh tay đòn: Mô hình giải tích hiện tại dựa trên các
khoảng cách hình học tĩnh. Nó chưa bao hàm đầy đủ sự biến thiên liên tục của
cánh tay đòn dọc trục thẳng đứng ( Z ) khi các ngàm Servo nghiêng ở góc độ lớn.
 Chưa tận dụng Không gian Null (Null-space): Bộ trộn đại số chỉ tìm ra một
nghiệm thỏa mãn bài toán lực, thay vì tìm ra nghiệm tối ưu nhất. Hệ thống lãng
phí 10 bậc tự do dư thừa vốn có thể được dùng để liên tục nắn chỉnh cấu hình
ngàm về các góc tối ưu khí động học.
 Giới hạn của bộ điều khiển PID: Cấu trúc Cascade PID truyền thống gặp khó
khăn trong việc dự báo và xử lý các hệ thống có tính phi tuyến và biến thiên thời
gian cao như cấu hình Tilt-Rotor.
 Giới hạn cực đại ở góc nghiêng lớn: Thực nghiệm ở góc 80 đã chạm đến giới
hạn của kiến trúc Phân bổ Điều khiển Giải tích Tuyến tính (Analytical Linear
Allocation) được sử dụng trong Phiên bản V1. Để UAV có thể vận hành an toàn
và khai thác tối đa cấu hình siêu dư cơ cấu chấp hành (Over-actuated) ở các góc
nghiêng cực đại  		80	  , hệ thống bắt buộc phải được nâng cấp sang kiến trúc

-- 43 of 44 --

Báo cáo giai đoạn 1 OVAP-X1
Tài liệu bảo mật cấp A2 Bản quyền thuộc về CT UAV- CT Group *Nghiêm cấm sao chép dưới mọi hình thức*
Trang 45
Phân bổ Điều khiển Phi tuyến tính.
3. Định hướng phát triển Giai đoạn 2 (Version 2)
 Để khai thác triệt để sức mạnh của cấu hình OVAP-X1, Giai đoạn 2 sẽ tập trung
vào việc nâng cấp toàn diện thuật toán điều khiển và phân bổ lực:
o Thuật toán Phân bổ Giả nghịch đảo có Trọng số (WPIN): Thay thế bộ trộn
đại số bằng ma trận phân phối lực phụ thuộc trạng thái toàn cục
 	 6 16
,	A
  
  . Áp dụng thuật toán WPIN để giải quyết bài toán tối ưu
đa mục tiêu: vừa cực tiểu hóa tiêu thụ năng lượng (Nhiệm vụ chính), vừa
tận dụng Không gian Null để nắn chỉnh hình học Servo về trạng thái tối
ưu mà không làm thay đổi quỹ đạo bay (Nhiệm vụ phụ) .

-- 44 of 44 --

