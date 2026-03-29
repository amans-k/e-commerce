import { Request, Response } from "express";
import { verifyWebhook } from "@clerk/express/webhooks";
import User from "../models/User.js";

export const clerkWebhook = async (req: Request, res: Response) => {
    try {
        const evt: any = await verifyWebhook(req);

        if (evt.type === "user.created" || evt.type === "user.updated") {
            const email = evt.data?.email_addresses[0]?.email_address;
            
            // Find by either clerkId OR email (to prevent duplicate email)
            const user = await User.findOne({ 
                $or: [
                    { clerkId: evt.data.id },
                    { email: email }
                ]
            });

            const userData = {
                clerkId: evt.data.id,
                email: email,
                name: `${evt.data?.first_name || ""} ${evt.data?.last_name || ""}`.trim(),
                image: evt.data?.image_url,
            };

            if (user) {
                // Update existing user (update clerkId if email matched)
                await User.findOneAndUpdate(
                    { _id: user._id }, 
                    userData,
                    { upsert: false }
                );
            } else {
                // Create new user
                await User.create(userData);
            }
        }

        return res.json({ success: true, message: "Webhook received" });
    } catch (err) {
        console.error("Error verifying webhook:", err);
        return res.status(400).json({ success: false, message: "Error verifying webhook" });
    }
};