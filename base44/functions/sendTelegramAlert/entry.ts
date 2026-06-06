import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, parse_mode = 'HTML', target_chat_id } = body;

    if (!message) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return Response.json({ error: 'Telegram bot token not configured' }, { status: 500 });
    }

    // Determine chat ID: use target_chat_id if provided (for system broadcasts), otherwise use current user's
    let telegramChatId = target_chat_id;
    
    if (!telegramChatId) {
      const userData = await base44.auth.me();
      telegramChatId = userData.telegram_chat_id;
      
      if (!telegramChatId) {
        return Response.json({ 
          error: 'Telegram chat ID not configured. Please set it in Settings.',
          requires_setup: true
        }, { status: 400 });
      }
    }

    // Send message via Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode
      })
    });

    const result = await response.json();

    if (!result.ok) {
      console.log('[Telegram] Error:', result);
      return Response.json({ 
        error: 'Failed to send Telegram message',
        details: result.description 
      }, { status: 500 });
    }

    console.log('[Telegram] Message sent successfully to chat', telegramChatId);
    return Response.json({ success: true, message_id: result.result.message_id });

  } catch (error) {
    console.log('[sendTelegramAlert] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});