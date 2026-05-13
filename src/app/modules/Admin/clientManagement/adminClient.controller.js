import { AdminClientService } from "./adminClient.service.js";

const getClientsByProjectManagerIdController = async (req, res, next) => {
    try {
        const { projectManagerId } = req.params;
        const clients = await AdminClientService.getClientsByProjectManagerId(projectManagerId);
        
        res.status(200).json({
            success: true,
            message: "Clients retrieved successfully",
            data: clients
        });
    } catch (error) {
        next(error);
    }
};

const getAllClientsController = async (req, res, next) => {
    try {
        const clients = await AdminClientService.getAllClients();
        
        res.status(200).json({
            success: true,
            message: "All clients retrieved successfully",
            data: clients
        });
    } catch (error) {
        next(error);
    }
};

export const AdminClientController = {
    getClientsByProjectManagerIdController,
    getAllClientsController
};
