import { AdminVendorService } from "./adminVendor.service.js";

const getVendorsByProjectManagerIdController = async (req, res, next) => {
    try {
        const { projectManagerId } = req.params;
        const vendors = await AdminVendorService.getVendorsByProjectManagerId(projectManagerId);
        
        res.status(200).json({
            success: true,
            message: "Vendors retrieved successfully",
            data: vendors
        });
    } catch (error) {
        next(error);
    }
};

export const AdminVendorController = {
    getVendorsByProjectManagerIdController
};
