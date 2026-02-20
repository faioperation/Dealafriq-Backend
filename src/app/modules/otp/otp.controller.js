import { OtpService } from "./otp.service.js";
import DevBuildError from "../../lib/DevBuildError.js";

//        SEND OTP   

const sendOtp = async (req, res) => {
  try {
    const prisma = req.prisma;
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await OtpService.sendOtp(prisma, email, name);

    return res.json({
      success: true,
      message: "OTP sent successfully",
      data: null,
    });
  } catch (error) {
    console.error("sendOtp error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};


//     VERIFY OTP      


const verifyOtp = async (req, res) => {
  try {
    const prisma = req.prisma;
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    await OtpService.verifyOtp(prisma, email, otp);

    return res.json({
      success: true,
      message: "OTP verified successfully",
      data: null,
    });
  } catch (error) {
    console.error("verifyOtp error:", error);

    if (error instanceof DevBuildError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};


export const OtpController = {
  sendOtp,
  verifyOtp,
};
