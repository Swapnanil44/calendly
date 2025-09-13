import "use-server";
import { clerkClient } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { endOfDay, startOfDay, parseISO } from "date-fns";

export async function getCalenderEventTimes(
  clerkUserId: string,
  { start, end }: { start: Date; end: Date }
) {
    try {
        const oAuthClient = await getOAuthClient(clerkUserId);
        
        if (!oAuthClient) {
            console.warn("No OAuth client available for user:", clerkUserId);
            return [];
        }

        const events = await google.calendar("v3").events.list({
            calendarId: "primary",
            eventTypes: ["default"],
            singleEvents: true,
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            maxResults: 2500,
            auth: oAuthClient
        });

        return events.data.items?.map(event => {
            // Handle all-day events (date property)
            if(event.start?.date != null && event.end?.date != null){
                return {
                    start: startOfDay(parseISO(event.start.date)),
                    end: endOfDay(parseISO(event.end.date)) // Fixed: use event.end.date
                }
            }

            // Handle timed events (dateTime property)
            if(event.start?.dateTime != null && event.end?.dateTime != null){
                return {
                    start: new Date(event.start.dateTime),
                    end: new Date(event.end.dateTime) // Fixed: use event.end.dateTime
                }
            }
            
            return null;
        }).filter(date => date != null) || [];
        
    } catch (error) {
        console.error("Calendar API error:", error);
        // if (error.code === 403) {
        //     console.warn("Insufficient permissions for calendar access");
        //     return [];
        // }
        throw error;
    }
}

async function getOAuthClient(clerkUserId: string){
    try {
        const token = await (await clerkClient()).users.getUserOauthAccessToken(clerkUserId, "google");

        if(token.data.length === 0 || token.data[0].token === null){
            return null;
        }

        console.log("Token scope:", token.data[0].scopes);
        console.log("Token exists:", !!token.data[0].token);

        const client = new google.auth.OAuth2(
            process.env.GOOGLE_OAUTH_CLIENT_ID,
            process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            process.env.GOOGLE_OAUTH_REDIRECT_URL
        );

        client.setCredentials({ access_token: token.data[0].token });

        return client;
    } catch (error) {
        console.error("Error creating OAuth client:", error);
        return null;
    }
}