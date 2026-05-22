/*
 * Bản có chú thích tiếng Việt của `publisher.cc` từ ví dụ gz::transport
 * Mục tiêu: giải thích từng phần để dễ đọc cho người học.
 */

// Thư viện chuẩn C++
#include <atomic>   // std::atomic
#include <chrono>   // std::chrono (để sleep)
#include <csignal>  // signal handling (SIGINT, SIGTERM)
#include <iostream> // std::cout, std::cerr
#include <string>   // std::string
#include <thread>   // std::this_thread::sleep_for

// Thư viện của gz (Ignition/Gazebo transport)
#include <gz/msgs.hh>
#include <gz/transport.hh>

/// rief Cờ để thoát vòng lặp publish một cách an toàn (thread-safe)
static std::atomic<bool> g_terminatePub(false);

//////////////////////////////////////////////////
/// rief Hàm callback khi nhận tín hiệu SIGINT hoặc SIGTERM.
/// Mục đích: gán cờ `g_terminatePub = true` để vòng lặp chính dừng lại
/// và chương trình kết thúc một cách trơn tru.
void signal_handler(int _signal)
{
  // Nếu nhận Ctrl+C (SIGINT) hoặc lệnh terminate (SIGTERM)
  if (_signal == SIGINT || _signal == SIGTERM)
    g_terminatePub = true; // đánh dấu để vòng lặp chính dừng
}

//////////////////////////////////////////////////
int main(int argc, char **argv)
{
  // Cài đặt handler cho SIGINT và SIGTERM
  // Khi người dùng nhấn Ctrl+C, chương trình sẽ gọi signal_handler
  std::signal(SIGINT,  signal_handler);
  std::signal(SIGTERM, signal_handler);

  // Tạo một node của transport và khai báo (advertise) một topic
  gz::transport::Node node; // node dùng để publish/subscribe
  std::string topic = "/foo"; // tên topic

  // Đăng ký publisher cho kiểu message `gz::msgs::StringMsg` trên topic
  auto pub = node.Advertise<gz::msgs::StringMsg>(topic);
  if (!pub)
  {
    // Nếu Advertise thất bại, in lỗi và thoát
    std::cerr << "Error advertising topic [" << topic << "]" << std::endl;
    return -1;
  }

  // Chuẩn bị message để publish: kiểu StringMsg có field `data`
  gz::msgs::StringMsg msg;
  msg.set_data("HELLO"); // đặt nội dung chuỗi gửi đi

  // Vòng lặp publish: gửi message mỗi 1 giây (1Hz)
  while (!g_terminatePub)
  {
    // Thử publish, nếu thất bại thì thoát vòng lặp
    if (!pub.Publish(msg))
      break;

    // In thông báo ra console để biết đã publish
    std::cout << "Publishing hello on topic [" << topic << "]" << std::endl;

    // Dừng thread hiện tại 1000ms = 1 giây
    std::this_thread::sleep_for(std::chrono::milliseconds(1000));
  }

  return 0; // Thoát chương trình
}
