import discord
from discord import app_commands
from discord.ui import Select, View, Button
import json
import os

# Токен берем из переменных окружения (настройки хостинга)
TOKEN = os.environ.get('DISCORD_TOKEN')
if not TOKEN:
    raise ValueError("Токен не найден! Установите переменную окружения DISCORD_TOKEN")

# ID сервера — опционально, для быстрой синхронизации
GUILD_ID = 123456789012345678  # замените на ваш ID

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True
intents.voice_states = True

# Загружаем названия из JSON
def load_room_names():
    with open('room_names.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        return data['rooms']

ROOM_NAMES = load_room_names()
ITEMS_PER_PAGE = 25

class PaginatedSelectView(View):
    def __init__(self, page=0):
        super().__init__(timeout=60)
        self.page = page
        self.total_pages = (len(ROOM_NAMES) + ITEMS_PER_PAGE - 1) // ITEMS_PER_PAGE
        self.add_item(self.create_select())
        if self.total_pages > 1:
            self.add_item(self.create_prev_button())
            self.add_item(self.create_next_button())
    
    def create_select(self):
        start = self.page * ITEMS_PER_PAGE
        end = min(start + ITEMS_PER_PAGE, len(ROOM_NAMES))
        page_names = ROOM_NAMES[start:end]
        
        select = Select(
            placeholder=f"📋 Страница {self.page + 1}/{self.total_pages} · Выбери название",
            options=[discord.SelectOption(label=name[:100], value=name) for name in page_names]
        )
        
        async def select_callback(interaction: discord.Interaction):
            chosen_name = select.values[0]
            guild = interaction.guild
            category = interaction.channel.category
            
            try:
                voice_channel = await guild.create_voice_channel(
                    name=chosen_name,
                    category=category,
                    user_limit=6,
                    reason=f"Создан игроком {interaction.user.name}"
                )
                await interaction.response.send_message(
                    f"✅ Создана комната: **{voice_channel.name}** (лимит: 6 человек)",
                    ephemeral=True
                )
            except Exception as e:
                await interaction.response.send_message(f"❌ Ошибка: {e}", ephemeral=True)
        
        select.callback = select_callback
        return select
    
    def create_prev_button(self):
        button = Button(label="◀ Назад", style=discord.ButtonStyle.secondary)
        async def callback(interaction: discord.Interaction):
            if self.page > 0:
                await interaction.response.edit_message(view=PaginatedSelectView(page=self.page - 1))
            else:
                await interaction.response.send_message("Это первая страница!", ephemeral=True)
        button.callback = callback
        return button
    
    def create_next_button(self):
        button = Button(label="Вперёд ▶", style=discord.ButtonStyle.secondary)
        async def callback(interaction: discord.Interaction):
            if self.page + 1 < self.total_pages:
                await interaction.response.edit_message(view=PaginatedSelectView(page=self.page + 1))
            else:
                await interaction.response.send_message("Это последняя страница!", ephemeral=True)
        button.callback = callback
        return button

class Client(discord.Client):
    def __init__(self):
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
    
    async def setup_hook(self):
        if GUILD_ID:
            guild = discord.Object(id=GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
        else:
            await self.tree.sync()
    
    async def on_ready(self):
        print(f'✅ Бот {self.user} запущен! Загружено {len(ROOM_NAMES)} названий комнат')

client = Client()

@client.tree.command(name="комната", description="Создать голосовую комнату на 6 человек")
async def create_room_command(interaction: discord.Interaction):
    view = PaginatedSelectView(page=0)
    await interaction.response.send_message(
        "🎤 **Выбери название для голосовой комнаты (лимит: 6 человек)**\n└ Используй кнопки ◀ Назад / Вперёд ▶",
        view=view,
        ephemeral=True
    )

if __name__ == "__main__":
    client.run(TOKEN)