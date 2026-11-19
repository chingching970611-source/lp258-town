/* Translations: 简体中文 (default) and English. Use I18N.t('key', {params}). */
(function () {
  const zh = {
    'app.name': 'LP 258 小镇',
    'app.tagline': '和朋友重新连结，一起玩、一起聊！',
    'lang.zh': '简体中文', 'lang.en': 'English', 'lang.switch': 'EN',

    'join.random': '🎲 随机造型', 'join.nickname': '你的昵称', 'join.nickPh': '例如：小明 Ming', 'join.enter': '进入小镇 →',
    'join.haveCode': '已经有账号？用登录码登录', 'join.codePh': '粘贴你的登录码', 'join.login': '登录',
    'join.needNick': '请输入昵称，让大家知道你是谁 😊', 'join.welcome': '欢迎来到 LP 258 小镇！在「我的」可以看到你的登录码', 'join.badCode': '登录码不正确',
    'tip.move': '💡 点击地面或用 WASD / 方向键走动，点击其他朋友可以打招呼',

    'top.online': '{n} 在线', 'top.points': '我的积分', 'top.friends': '在线朋友',
    'chat.ph': '说点什么…（Enter 发送）', 'chat.dmPh': '私信 {name}…', 'chat.send': '发送', 'chat.emote': '表情',
    'nav.chat': '聊天', 'nav.online': '朋友', 'nav.games': '游戏区', 'nav.rank': '排行榜', 'nav.hq': 'HQ 活动', 'nav.me': '我的',
    'title.chat': '💬 聊天', 'title.online': '👥 在线朋友', 'title.games': '🎮 游戏区', 'title.rank': '🏆 积分榜', 'title.hq': '📍 HQ 活动中心', 'title.me': '👤 我的',
    'zone.hq': '📍 HQ 活动中心', 'zone.game': '🎮 游戏区', 'zone.cafe': '☕ 聊天咖啡馆', 'zone.rank': '🏆 积分榜', 'zone.enter': '进入 {name}', 'plaza.sign': '🏡 LP 258 广场',
    'world.menu': '菜单', 'world.menu1': '☕ 咖啡   🧋 奶茶', 'world.menu2': '🍰 蛋糕   🍪 饼干',

    'log.joined': '👋 {name} 上线了', 'log.poke': '{name} 向你打招呼', 'toast.poke': '👋 {name} 向你打招呼！', 'toast.dm': '💌 {name} 私信你：{text}',
    'ticker.default': '欢迎来到 LP 258 小镇！', 'loading': '加载中…', 'close': '关闭', 'ok': '好',

    'chat.all': '全部', 'chat.dm': '🔒 私信', 'chat.empty': '还没有消息，打个招呼吧 👋', 'chat.hint': '在下方输入框发送消息；点击朋友头像可以私信',
    'chat.dmTo': '🔒 私信 → {name}', 'chat.dmFrom': '🔒 {name} 私信你',
    'online.count': '现在有 {n} 位朋友在小镇', 'online.you': '（你）', 'online.status': '在线中 🟢',

    'card.points': '⭐ {n} 分', 'card.wave': '👋 打招呼', 'card.dm': '💬 私信', 'card.walk': '🚶 走过去', 'card.room': '🏠 参观房间', 'card.waved': '你向 {name} 打了招呼 👋',

    'games.quiz': '❓ 问答', 'games.riddle': '🧩 猜谜', 'games.mini': '⭐ 小游戏', 'games.lp': '🏅 LP 挑战',
    'quiz.intro': '每题只能答一次，答对有积分！已完成 {done}/{total}', 'quiz.none': '主持人还没出题，晚点再来 🙂',
    'quiz.right': '✅ 答对', 'quiz.wrong': '❌ 答错', 'quiz.toastRight': '答对了！+{n} 分 🎉', 'quiz.toastWrong': '答错了，下次加油 💪',
    'riddle.intro': '猜中谜底就有分！可以按 💡 看提示', 'riddle.none': '暂时没有谜题', 'riddle.solved': '✅ 已解开', 'riddle.ph': '你的答案…', 'riddle.go': '答',
    'riddle.noHint': '没有提示哦', 'riddle.toastRight': '猜中了！+{n} 分 🧩', 'riddle.toastWrong': '不对哦，再想想 🤔',
    'lp.intro': '完成挑战后提交证明（例如描述、照片链接），主持人审核后就会加分！', 'lp.none': '暂时没有挑战', 'lp.done': '✅ 已完成', 'lp.pending': '⏳ 审核中',
    'lp.yours': '你的提交：', 'lp.rejected': '上次未通过，可以再提交', 'lp.ph': '说说你怎么完成的，或贴上照片链接…', 'lp.submit': '提交挑战',
    'lp.need': '请填写提交内容', 'lp.sent': '已提交！等待主持人审核 ⏳',
    'mini.intro': '30 秒内移动篮子接 ⭐（+1）和 🌟（+3），避开 💣（-3）！刷新个人纪录 +5 积分', 'mini.best': '你的最佳纪录：', 'mini.start': '▶️ 开始游戏',
    'mini.again': '🔁 再玩一次', 'mini.title': '⭐ 接星星 ⭐', 'mini.how': '用鼠标 / 手指 / 方向键移动', 'mini.timeUp': '时间到！',
    'mini.newBest': '新纪录！{n} ⭐ 🎉', 'mini.result': '这次 {n} ⭐，最佳纪录 {best}',

    'rank.points': '⭐ 总积分', 'rank.mini': '🎮 接星星', 'rank.empty': '还没有人上榜，快去游戏区赚分！', 'rank.online': '🟢 在线', 'rank.offline': '离线', 'rank.first': '第一名等你来！',

    'hq.news': '📢 最新公告', 'hq.upcoming': '🗓️ 即将举行（{n}）', 'hq.none': '暂时没有新活动，留意主持人公布！', 'hq.past': '📸 活动记录（{n}）',
    'hq.notify': '🔔 开启浏览器通知（活动前提醒你）',
    'event.live': '🔴 进行中', 'event.record': '📝 活动记录', 'event.going': '👥 {n} 人会出席', 'event.rsvpOn': '✅ 会出席・已提醒', 'event.rsvp': '🔔 我会去・提醒我',
    'event.ics': '📅 加入日历', 'event.map': '🗺️ 地图', 'event.toastOn': '已设置提醒，活动前会通知你 🔔', 'event.toastOff': '已取消提醒', 'event.next': '下一个活动', 'event.tbc': '敬请期待',
    'rel.started': '已开始', 'rel.min': '{n} 分钟后', 'rel.hour': '{n} 小时后', 'rel.day': '{n} 天后',
    'remind.bar': '⏰ 提醒：「{title}」{rel}开始 @ {venue}', 'remind.hour': '⏰ 「{title}」一小时后开始！', 'notify.on': '已开启通知 🔔',

    'me.tabRoom': '🏠 我的房间', 'me.tabLook': '🎨 换造型', 'me.tabAccount': '🔑 账号',
    'me.nick': '昵称', 'me.status': '状态', 'me.statusPh': '例如：今晚有人玩 Quiz 吗？', 'me.save': '💾 保存', 'me.saved': '已保存 ✨',
    'me.code': '🔑 我的登录码', 'me.codeHint': '在其他设备用这个码登录同一个账号。请不要分享给别人！', 'me.copy': '📋 复制', 'me.copied': '已复制',
    'me.logout': '🚪 退出登录', 'me.logoutConfirm': '确定退出？请先记下你的登录码，否则无法再登录这个账号。', 'me.lang': '🌐 语言 Language', 'me.reveal': '点击显示',

    'live.tag': '⚡ 主持人即时问答', 'live.points': '答对 +{n} 分，最快答对再 +5！', 'live.answered': '✅ 已作答，等结果…', 'live.count': '已有 {n} 人作答',
    'live.result': '⚡ 即时问答结果', 'live.none': '你这次没有作答', 'live.right': '🎉 答对了！', 'live.wrong': '😅 答错了', 'live.stats': '{c}/{t} 人答对',

    'room.title': '🏠 {name} 的房间', 'room.empty': '还没布置房间', 'room.emptyOther': '{name} 还没布置房间', 'room.quizStart': '✨ 做性格测验，布置我的房间',
    'room.retake': '🔄 重新测验', 'room.pick': '或者直接选职业：', 'room.wall': '墙纸颜色', 'room.welcomeTitle': '来布置你的小房间吧！',
    'room.welcomeBody': '回答 5 个小问题，我们会根据你的性格帮你选职业和房间风格 🏡', 'room.later': '稍后再说', 'room.go': '开始',
    'room.result': '你的性格最适合当…', 'room.save': '🏡 搬进去！', 'room.saved': '房间布置好了 🏡', 'room.personality': '性格：{trait}', 'room.back': '← 上一题',
    'room.questions': [
      { q: '周末你最想做什么？', a: ['去郊外徒步、探索新地方', '在家煮饭请朋友吃', '画画、做手工', '看书或者玩游戏'] },
      { q: '朋友通常怎么形容你？', a: ['可靠踏实', '热情开朗', '很有创意', '温柔细心'] },
      { q: '你最喜欢的房间感觉是？', a: ['阳光充足、满满植物', '飘着食物香味的厨房', '五颜六色、充满灵感', '安静整齐、适合专心'] },
      { q: '遇到难题时你会？', a: ['马上行动试试看', '冷静分析找方法', '找朋友一起商量', '换个角度想'] },
      { q: '你最想拥有哪种超能力？', a: ['让植物瞬间长大', '瞬间移动到任何地方', '听懂所有音乐和语言', '无限的创造力'] },
    ],
    'jobs': {
      farmer: { name: '农夫', trait: '踏实温暖', desc: '照顾田地和小动物，总是让人安心。' },
      chef: { name: '厨师', trait: '热情好客', desc: '用美食把大家聚在一起。' },
      artist: { name: '画家', trait: '创意浪漫', desc: '把生活画成五颜六色。' },
      coder: { name: '程序员', trait: '理性好奇', desc: '喜欢解决难题，脑袋转得快。' },
      musician: { name: '音乐人', trait: '感性自由', desc: '走到哪里都带着旋律。' },
      explorer: { name: '探险家', trait: '勇敢冒险', desc: '永远好奇下一座山后面有什么。' },
      florist: { name: '花艺师', trait: '温柔细腻', desc: '用花朵传递心意。' },
      bookworm: { name: '作家', trait: '安静深思', desc: '在书本和文字里找到快乐。' },
    },

    'opts': {
      skin: '肤色', hair: '发型', hairColor: '发色', outfit: '衣服', outfitColor: '衣服颜色', face: '表情', acc: '配饰',
      hairNames: ['蓬松短发', '刺猬头', '长直发', '波波头', '丸子头', '马尾', '卷发', '双马尾', '麻花辫', '偏分', '光头'],
      outfitNames: ['T 恤', '连帽衫', '连衣裙', '西装', '背带裤'],
      faceNames: ['开心', '大笑', '眨眼', '酷', '害羞', '惊讶', '生气', '爱心', '困'],
      accNames: ['无', '眼镜', '猫耳', '皇冠', '花朵', '耳机', '蝴蝶结', '草帽', '头巾'],
    },

    'sys.quiz': '🎉 {name} 答对了一题问答 +{pts} 分', 'sys.riddle': '🎉 {name} 解开了一道谜语 🧩 +{pts} 分',
    'sys.mini': '🎉 {name} 在「接星星」刷新个人纪录 {score} ⭐ +{pts} 分', 'sys.challenge': '🎉 {name} 完成了 LP 挑战「{title}」🏅 +{pts} 分',
    'sys.liveStart': '⚡ 主持人开始了一场即时问答！快来作答！', 'sys.liveEnd': '⚡ 即时问答结束！答案是「{answer}」，{count} 人答对', 'sys.liveFirst': '，最快的是 {first} 🏅',
    'sys.room': '🏡 {name} 搬进了新房间，成为 {job}！',
    'notice.soon': '⏰ 活动提醒：「{title}」一小时内开始 @ {venue}', 'notice.ok': '✅ 你的挑战「{title}」已通过！+{pts} 分',
    'notice.no': '❌ 你的挑战「{title}」未通过，可以再提交一次', 'notice.remind': '📣 HQ 提醒：「{title}」— {date} @ {venue}',
    'kicked.banned': '你的账号已被管理员停用', 'kicked.deleted': '你的账号已被管理员删除',

    'err.network': '网络错误（{code}）', 'err.offline': '连不上服务器，请稍后再试',
    'err.relogin': '请重新登录', 'err.banned': '你的账号已被管理员停用', 'err.nick_required': '请输入昵称', 'err.too_fast': '太快了，慢慢来',
    'err.empty_msg': '消息不能为空', 'err.friend_not_found': '找不到这位朋友', 'err.bad_request': '请求无效', 'err.not_found': '找不到这项内容',
    'err.quiz_answered': '你已经答过这题', 'err.riddle_solved': '你已经解开这题', 'err.submit_text_required': '请填写提交内容', 'err.challenge_submitted': '你已经提交过这个挑战',
    'err.live_over': '问答已经结束', 'err.live_answered': '你已经作答', 'err.admin_relogin': '请重新登录后台', 'err.too_many_attempts': '尝试太多次，请一分钟后再试',
    'err.wrong_password': '密码错误', 'err.field_required': '请填写必填项', 'err.invalid_date': '请填写有效日期', 'err.min_options': '至少要有 2 个选项',
    'err.answer_not_in_options': '正确答案不在选项里', 'err.live_running': '已经有一场即时问答正在进行', 'err.pw_env': '密码由 ADMIN_PASSWORD 环境变量设定，请在那里修改',
    'err.pw_short': '密码至少 8 个字符', 'err.server_error': '服务器错误', 'err.not_connected': '连接中断，正在重连', 'err.too_large': '内容太长', 'err.forbidden': '没有权限',

    // ---------------- admin
    'ad.title': '🛠️ LP 258 主持人后台', 'ad.only': '只限主持人 / 管理员登录', 'ad.pwPh': '管理员密码', 'ad.login': '登录',
    'ad.pwHint': '第一次启动时，密码会保存在服务器的 data/admin-password.txt。', 'ad.toTown': '🏡 去小镇', 'ad.refresh': '🔄 刷新', 'ad.logout': '退出',
    'ad.refreshed': '已更新', 'ad.saved': '已保存 ✅', 'ad.deleted': '已删除', 'ad.updated': '已更新', 'ad.cancel': '取消', 'ad.save': '保存', 'ad.edit': '✏️ 编辑', 'ad.delete': '🗑️ 删除',
    'ad.add': '＋ 新增{what}', 'ad.addTitle': '新增{what}', 'ad.editTitle': '编辑{what}', 'ad.noData': '还没有资料', 'ad.confirmDelete': '确定删除「{name}」？删除后无法恢复。',
    'ad.tab.overview': '📊 概览', 'ad.tab.events': '📍 活动', 'ad.tab.quiz': '❓ 问答', 'ad.tab.riddles': '🧩 猜谜', 'ad.tab.challenges': '🏅 LP 挑战',
    'ad.tab.review': '✅ 审核', 'ad.tab.users': '👥 成员', 'ad.tab.announce': '📢 公告', 'ad.tab.settings': '⚙️ 设置',
    'ad.stat.online': '🟢 现在在线', 'ad.stat.users': '👥 成员总数', 'ad.stat.upcoming': '🗓️ 即将举行活动', 'ad.stat.pending': '⏳ 待审核挑战',
    'ad.liveNow': '⚡ 即时问答进行中：「{q}」— {n} 人已作答', 'ad.lastLive': '上一场即时问答：「{q}」{c}/{t} 人答对', 'ad.lastLiveFirst': '，最快：{name}',
    'ad.onlineMembers': '🟢 在线成员', 'ad.nobody': '暂时没有人在线', 'ad.nextEvent': '🗓️ 下一个活动', 'ad.noEvent': '还没有活动 — 去「📍 活动」新增',
    'ad.nextEventLine': '{date} @ {venue} · {n} 人会出席', 'ad.quick': '⚡ 快速管理', 'ad.quickHint': '每个分类都可以新增、编辑、删除：',
    'ad.col.events': '活动', 'ad.col.quiz': '问答题', 'ad.col.riddles': '谜题', 'ad.col.challenges': 'LP 挑战',
    'ad.f.title': '活动名称 *', 'ad.f.date': '开始时间 *', 'ad.f.endDate': '结束时间', 'ad.f.venue': '场地', 'ad.f.address': '地点 / 地址', 'ad.f.content': '活动内容',
    'ad.f.record': '活动记录（活动后填写，会显示在「活动记录」）', 'ad.f.question': '题目 *', 'ad.f.options': '选项（点圆圈选正确答案）', 'ad.f.points': '积分',
    'ad.f.riddleQ': '谜面 *', 'ad.f.riddleA': '谜底 *（多个可接受答案用 | 分隔，例如：球门|龙门）', 'ad.f.hint': '提示', 'ad.f.chTitle': '挑战名称 *', 'ad.f.chDesc': '说明', 'ad.f.active': '状态',
    'ad.f.optReq': '选项（必填）', 'ad.f.optOpt': '选项（可留空）', 'ad.f.ansBlank': '正确答案那一格不能空白', 'ad.open': '🟢 开放', 'ad.closed': '⚪ 关闭',
    'ad.h.event': '活动', 'ad.h.time': '时间', 'ad.h.venue': '场地', 'ad.h.going': '出席', 'ad.h.question': '题目', 'ad.h.answer': '答案', 'ad.h.points': '分',
    'ad.h.riddle': '谜面', 'ad.h.riddleA': '谜底', 'ad.h.challenge': '挑战', 'ad.h.status': '状态', 'ad.h.member': '成员', 'ad.h.content': '提交内容',
    'ad.h.nick': '昵称', 'ad.h.job': '房间职业', 'ad.h.lastSeen': '最后上线',
    'ad.goingN': '{n} 人', 'ad.liveBtn': '⚡ 即时问答', 'ad.remindBtn': '📣 提醒', 'ad.quizHint': '「⚡ 即时问答」会立即把题目推送给所有在线成员，限时作答，答对加分，最快答对再 +5。',
    'ad.eventHint': '活动结束后，可以「编辑」并填写「活动记录」。设置了提醒的成员会在活动前 1 小时自动收到通知；「📣 提醒」可以立即推送。',
    'ad.livePrompt': '推送即时问答：「{q}」\n作答时间（秒，10–120）：', 'ad.liveSent': '⚡ 已推送给所有在线成员', 'ad.reminded': '已提醒 {reached} 位在线成员（共 {rsvp} 人设置提醒）',
    'ad.rsvpTitle': '{n} 人会出席 / 设置了提醒', 'ad.nobodyYet': '暂时还没有人',
    'ad.reviewTitle': '✅ LP 挑战审核', 'ad.reviewHint': '通过后会自动给成员加分；撤回通过会扣回分数。', 'ad.noSubs': '暂时没有提交',
    'ad.st.pending': '⏳ 待审核', 'ad.st.approved': '✅ 已通过', 'ad.st.rejected': '❌ 未通过', 'ad.approve': '通过', 'ad.reject': '拒绝', 'ad.revoke': '撤回',
    'ad.usersTitle': '👥 成员（{n}）', 'ad.noUsers': '还没有成员', 'ad.banned': '⛔ 已停用', 'ad.online': '🟢 在线', 'ad.offline': '⚪ 离线', 'ad.now': '现在',
    'ad.ban': '停用', 'ad.unban': '恢复', 'ad.banConfirm': '停用「{name}」？他/她会立即被登出，并无法再进入小镇。',
    'ad.userDeleteConfirm': '永久删除「{name}」？他/她的积分、提交和登录码都会被删除，无法恢复。', 'ad.editUser': '编辑成员', 'ad.noRoom': '—',
    'ad.announceTitle': '📢 公告', 'ad.announceHint': '公告会立即弹出给所有在线成员，并显示在小镇顶部和 HQ。', 'ad.announcePh': '例如：今晚 8 点 HQ 有 Quiz Night，记得来！',
    'ad.publish': '发布公告', 'ad.published': '已发布 📢', 'ad.editAnnounce': '编辑公告',
    'ad.settingsTitle': '⚙️ 设置', 'ad.pwTitle': '🔑 修改后台密码', 'ad.pwFromEnv': '现在密码由服务器的 ADMIN_PASSWORD 环境变量设定，请在那里修改。',
    'ad.pwNew': '新密码（至少 8 个字符）', 'ad.pwAgain': '再输入一次', 'ad.pwChange': '修改密码', 'ad.pwMismatch': '两次输入不一样', 'ad.pwChanged': '密码已修改 ✅',
    'ad.ago.now': '刚刚', 'ad.ago.min': '{n} 分钟前', 'ad.ago.hour': '{n} 小时前', 'ad.ago.day': '{n} 天前',
  };

  const en = {
    'app.name': 'LP 258 Town',
    'app.tagline': 'Reconnect with friends — play and chat together!',
    'lang.zh': '简体中文', 'lang.en': 'English', 'lang.switch': '中文',

    'join.random': '🎲 Random look', 'join.nickname': 'Your nickname', 'join.nickPh': 'e.g. Ming', 'join.enter': 'Enter town →',
    'join.haveCode': 'Have an account? Sign in with your code', 'join.codePh': 'Paste your sign-in code', 'join.login': 'Sign in',
    'join.needNick': 'Please enter a nickname so everyone knows who you are 😊', 'join.welcome': 'Welcome to LP 258 Town! Your sign-in code is under "Me"', 'join.badCode': "That sign-in code isn't right",
    'tip.move': '💡 Tap the ground or use WASD / arrow keys to walk. Tap a friend to say hi',

    'top.online': '{n} online', 'top.points': 'My points', 'top.friends': 'Friends online',
    'chat.ph': 'Say something… (Enter to send)', 'chat.dmPh': 'Message {name}…', 'chat.send': 'Send', 'chat.emote': 'Emotes',
    'nav.chat': 'Chat', 'nav.online': 'Friends', 'nav.games': 'Games', 'nav.rank': 'Ranking', 'nav.hq': 'Events', 'nav.me': 'Me',
    'title.chat': '💬 Chat', 'title.online': '👥 Friends online', 'title.games': '🎮 Game Zone', 'title.rank': '🏆 Leaderboard', 'title.hq': '📍 HQ Events', 'title.me': '👤 Me',
    'zone.hq': '📍 HQ Events', 'zone.game': '🎮 Game Zone', 'zone.cafe': '☕ Chat Café', 'zone.rank': '🏆 Leaderboard', 'zone.enter': 'Enter {name}', 'plaza.sign': '🏡 LP 258 Plaza',
    'world.menu': 'MENU', 'world.menu1': '☕ Coffee  🧋 Milk tea', 'world.menu2': '🍰 Cake  🍪 Cookies',

    'log.joined': '👋 {name} is online', 'log.poke': '{name} waved at you', 'toast.poke': '👋 {name} waved at you!', 'toast.dm': '💌 {name}: {text}',
    'ticker.default': 'Welcome to LP 258 Town!', 'loading': 'Loading…', 'close': 'Close', 'ok': 'OK',

    'chat.all': 'All', 'chat.dm': '🔒 Private', 'chat.empty': 'No messages yet — say hi 👋', 'chat.hint': "Type below to send; tap a friend's avatar to message them",
    'chat.dmTo': '🔒 To {name}', 'chat.dmFrom': '🔒 {name} (private)',
    'online.count': '{n} friends in town right now', 'online.you': ' (you)', 'online.status': 'Online 🟢',

    'card.points': '⭐ {n} pts', 'card.wave': '👋 Wave', 'card.dm': '💬 Message', 'card.walk': '🚶 Walk over', 'card.room': '🏠 Visit room', 'card.waved': 'You waved at {name} 👋',

    'games.quiz': '❓ Quiz', 'games.riddle': '🧩 Riddles', 'games.mini': '⭐ Mini game', 'games.lp': '🏅 LP Challenge',
    'quiz.intro': 'One try per question — correct answers earn points! Done {done}/{total}', 'quiz.none': 'No questions yet — check back later 🙂',
    'quiz.right': '✅ Correct', 'quiz.wrong': '❌ Wrong', 'quiz.toastRight': 'Correct! +{n} pts 🎉', 'quiz.toastWrong': 'Not quite — good luck next time 💪',
    'riddle.intro': 'Guess the answer to score! Tap 💡 for a hint', 'riddle.none': 'No riddles yet', 'riddle.solved': '✅ Solved', 'riddle.ph': 'Your answer…', 'riddle.go': 'Go',
    'riddle.noHint': 'No hint for this one', 'riddle.toastRight': 'Got it! +{n} pts 🧩', 'riddle.toastWrong': 'Not quite — think again 🤔',
    'lp.intro': 'Finish a challenge, then submit proof (a description or photo link). The host will review it and add points!', 'lp.none': 'No challenges yet',
    'lp.done': '✅ Completed', 'lp.pending': '⏳ Under review', 'lp.yours': 'Your submission: ', 'lp.rejected': "Last one wasn't approved — you can resubmit",
    'lp.ph': 'Tell us how you did it, or paste a photo link…', 'lp.submit': 'Submit', 'lp.need': 'Please write something first', 'lp.sent': 'Submitted! Waiting for the host to review ⏳',
    'mini.intro': 'Move the basket for 30 seconds: catch ⭐ (+1) and 🌟 (+3), dodge 💣 (−3)! A new personal best earns +5 pts', 'mini.best': 'Your best: ',
    'mini.start': '▶️ Start', 'mini.again': '🔁 Play again', 'mini.title': '⭐ Star Catch ⭐', 'mini.how': 'Move with mouse, finger or arrow keys', 'mini.timeUp': "Time's up!",
    'mini.newBest': 'New record! {n} ⭐ 🎉', 'mini.result': 'This round {n} ⭐, best {best}',

    'rank.points': '⭐ Points', 'rank.mini': '🎮 Star Catch', 'rank.empty': 'Nobody on the board yet — go earn points in the Game Zone!', 'rank.online': '🟢 Online', 'rank.offline': 'Offline',
    'rank.first': 'First place is waiting for you!',

    'hq.news': '📢 Announcements', 'hq.upcoming': '🗓️ Upcoming ({n})', 'hq.none': 'No upcoming events yet — stay tuned!', 'hq.past': '📸 Past events ({n})',
    'hq.notify': '🔔 Turn on browser notifications (event reminders)',
    'event.live': '🔴 Happening now', 'event.record': '📝 Event recap', 'event.going': '👥 {n} going', 'event.rsvpOn': '✅ Going · reminder set', 'event.rsvp': "🔔 I'm going · remind me",
    'event.ics': '📅 Add to calendar', 'event.map': '🗺️ Map', 'event.toastOn': "Reminder set — we'll notify you before it starts 🔔", 'event.toastOff': 'Reminder removed',
    'event.next': 'NEXT EVENT', 'event.tbc': 'Coming soon',
    'rel.started': 'started', 'rel.min': 'in {n} min', 'rel.hour': 'in {n} h', 'rel.day': 'in {n} days',
    'remind.bar': '⏰ Reminder: "{title}" starts {rel} @ {venue}', 'remind.hour': '⏰ "{title}" starts in 1 hour!', 'notify.on': 'Notifications on 🔔',

    'me.tabRoom': '🏠 My room', 'me.tabLook': '🎨 Change look', 'me.tabAccount': '🔑 Account',
    'me.nick': 'Nickname', 'me.status': 'Status', 'me.statusPh': 'e.g. Anyone up for a quiz tonight?', 'me.save': '💾 Save', 'me.saved': 'Saved ✨',
    'me.code': '🔑 My sign-in code', 'me.codeHint': "Use this code to sign in on another device. Don't share it!", 'me.copy': '📋 Copy', 'me.copied': 'Copied',
    'me.logout': '🚪 Sign out', 'me.logoutConfirm': "Sign out? Write down your sign-in code first, or you won't be able to get back into this account.",
    'me.lang': '🌐 Language 语言', 'me.reveal': 'Tap to show',

    'live.tag': '⚡ Live quiz from the host', 'live.points': 'Correct = +{n} pts, fastest gets +5 more!', 'live.answered': '✅ Answered — waiting for results…', 'live.count': '{n} answered',
    'live.result': '⚡ Live quiz results', 'live.none': "You didn't answer this time", 'live.right': '🎉 Correct!', 'live.wrong': '😅 Wrong', 'live.stats': '{c}/{t} correct',

    'room.title': "🏠 {name}'s room", 'room.empty': 'Room not set up yet', 'room.emptyOther': "{name} hasn't set up a room yet", 'room.quizStart': '✨ Take the personality quiz to set up my room',
    'room.retake': '🔄 Retake quiz', 'room.pick': 'Or pick a job yourself:', 'room.wall': 'Wallpaper', 'room.welcomeTitle': "Let's set up your little room!",
    'room.welcomeBody': "Answer 5 quick questions and we'll pick a job and room style that fits your personality 🏡", 'room.later': 'Maybe later', 'room.go': 'Start',
    'room.result': 'Your personality fits…', 'room.save': '🏡 Move in!', 'room.saved': 'Your room is ready 🏡', 'room.personality': 'Personality: {trait}', 'room.back': '← Back',
    'room.questions': [
      { q: 'What do you most want to do on the weekend?', a: ['Hike and explore new places', 'Cook at home for friends', 'Draw or make crafts', 'Read or play games'] },
      { q: 'How do friends usually describe you?', a: ['Reliable', 'Warm and outgoing', 'Creative', 'Gentle and caring'] },
      { q: 'Your favourite kind of room feels…', a: ['Sunny and full of plants', 'Like a kitchen that smells delicious', 'Colourful and inspiring', 'Quiet and tidy for focusing'] },
      { q: 'When you hit a tough problem, you…', a: ['Jump in and try something', 'Calmly analyse it', 'Talk it over with friends', 'Look at it from a new angle'] },
      { q: 'Which superpower would you pick?', a: ['Make plants grow instantly', 'Teleport anywhere', 'Understand every song and language', 'Unlimited creativity'] },
    ],
    'jobs': {
      farmer: { name: 'Farmer', trait: 'Steady and warm', desc: 'Looks after the fields and animals — always reassuring.' },
      chef: { name: 'Chef', trait: 'Warm and welcoming', desc: 'Brings everyone together with good food.' },
      artist: { name: 'Artist', trait: 'Creative and romantic', desc: 'Paints life in bright colours.' },
      coder: { name: 'Programmer', trait: 'Logical and curious', desc: 'Loves solving puzzles, quick thinker.' },
      musician: { name: 'Musician', trait: 'Free-spirited', desc: 'Carries a melody everywhere.' },
      explorer: { name: 'Explorer', trait: 'Brave and adventurous', desc: "Always wondering what's behind the next hill." },
      florist: { name: 'Florist', trait: 'Gentle and thoughtful', desc: 'Says it with flowers.' },
      bookworm: { name: 'Writer', trait: 'Quiet and reflective', desc: 'Finds joy in books and words.' },
    },

    'opts': {
      skin: 'Skin', hair: 'Hairstyle', hairColor: 'Hair colour', outfit: 'Outfit', outfitColor: 'Outfit colour', face: 'Expression', acc: 'Accessory',
      hairNames: ['Fluffy', 'Spiky', 'Long', 'Bob', 'Bun', 'Ponytail', 'Curly', 'Twin tails', 'Braid', 'Side part', 'Bald'],
      outfitNames: ['T-shirt', 'Hoodie', 'Dress', 'Suit', 'Overalls'],
      faceNames: ['Happy', 'Laughing', 'Wink', 'Cool', 'Shy', 'Surprised', 'Grumpy', 'In love', 'Sleepy'],
      accNames: ['None', 'Glasses', 'Cat ears', 'Crown', 'Flower', 'Headphones', 'Bow', 'Straw hat', 'Bandana'],
    },

    'sys.quiz': '🎉 {name} answered a quiz question +{pts} pts', 'sys.riddle': '🎉 {name} solved a riddle 🧩 +{pts} pts',
    'sys.mini': '🎉 {name} set a new Star Catch record: {score} ⭐ +{pts} pts', 'sys.challenge': '🎉 {name} completed the LP Challenge "{title}" 🏅 +{pts} pts',
    'sys.liveStart': '⚡ The host started a live quiz! Answer now!', 'sys.liveEnd': '⚡ Live quiz over! The answer was "{answer}" — {count} got it right', 'sys.liveFirst': ', fastest: {first} 🏅',
    'sys.room': '🏡 {name} moved into a new room as a {job}!',
    'notice.soon': '⏰ "{title}" starts within an hour @ {venue}', 'notice.ok': '✅ Your challenge "{title}" was approved! +{pts} pts',
    'notice.no': '❌ Your challenge "{title}" wasn\'t approved — you can try again', 'notice.remind': '📣 HQ reminder: "{title}" — {date} @ {venue}',
    'kicked.banned': 'Your account has been disabled by the host', 'kicked.deleted': 'Your account has been deleted by the host',

    'err.network': 'Network error ({code})', 'err.offline': "Can't reach the server, please try again later",
    'err.relogin': 'Please sign in again', 'err.banned': 'Your account has been disabled', 'err.nick_required': 'Please enter a nickname', 'err.too_fast': 'Slow down a little',
    'err.empty_msg': "Message can't be empty", 'err.friend_not_found': "Couldn't find that friend", 'err.bad_request': 'Invalid request', 'err.not_found': "Couldn't find that",
    'err.quiz_answered': 'You already answered this one', 'err.riddle_solved': 'You already solved this one', 'err.submit_text_required': 'Please write something first',
    'err.challenge_submitted': 'You already submitted this challenge', 'err.live_over': 'The quiz has ended', 'err.live_answered': 'You already answered',
    'err.admin_relogin': 'Please sign in to the backend again', 'err.too_many_attempts': 'Too many attempts — try again in a minute', 'err.wrong_password': 'Wrong password',
    'err.field_required': 'Please fill in the required fields', 'err.invalid_date': 'Please enter a valid date', 'err.min_options': 'Add at least 2 options',
    'err.answer_not_in_options': 'The correct answer must be one of the options', 'err.live_running': 'A live quiz is already running',
    'err.pw_env': 'The password comes from the ADMIN_PASSWORD environment variable — change it there', 'err.pw_short': 'Password must be at least 8 characters',
    'err.server_error': 'Server error', 'err.not_connected': 'Connection lost, reconnecting', 'err.too_large': 'Too long', 'err.forbidden': 'Not allowed',

    // ---------------- admin
    'ad.title': '🛠️ LP 258 Host Backend', 'ad.only': 'Hosts / admins only', 'ad.pwPh': 'Admin password', 'ad.login': 'Sign in',
    'ad.pwHint': "On first start, the password is saved on the server in data/admin-password.txt.", 'ad.toTown': '🏡 Open town', 'ad.refresh': '🔄 Refresh', 'ad.logout': 'Sign out',
    'ad.refreshed': 'Updated', 'ad.saved': 'Saved ✅', 'ad.deleted': 'Deleted', 'ad.updated': 'Updated', 'ad.cancel': 'Cancel', 'ad.save': 'Save', 'ad.edit': '✏️ Edit', 'ad.delete': '🗑️ Delete',
    'ad.add': '＋ Add {what}', 'ad.addTitle': 'New {what}', 'ad.editTitle': 'Edit {what}', 'ad.noData': 'Nothing here yet', 'ad.confirmDelete': 'Delete "{name}"? This can\'t be undone.',
    'ad.tab.overview': '📊 Overview', 'ad.tab.events': '📍 Events', 'ad.tab.quiz': '❓ Quiz', 'ad.tab.riddles': '🧩 Riddles', 'ad.tab.challenges': '🏅 LP Challenge',
    'ad.tab.review': '✅ Review', 'ad.tab.users': '👥 Members', 'ad.tab.announce': '📢 Announcements', 'ad.tab.settings': '⚙️ Settings',
    'ad.stat.online': '🟢 Online now', 'ad.stat.users': '👥 Members', 'ad.stat.upcoming': '🗓️ Upcoming events', 'ad.stat.pending': '⏳ Waiting for review',
    'ad.liveNow': '⚡ Live quiz running: "{q}" — {n} answered', 'ad.lastLive': 'Last live quiz: "{q}" {c}/{t} correct', 'ad.lastLiveFirst': ', fastest: {name}',
    'ad.onlineMembers': '🟢 Online members', 'ad.nobody': 'Nobody online right now', 'ad.nextEvent': '🗓️ Next event', 'ad.noEvent': 'No events yet — add one under "📍 Events"',
    'ad.nextEventLine': '{date} @ {venue} · {n} going', 'ad.quick': '⚡ Quick manage', 'ad.quickHint': 'Every section lets you add, edit and delete:',
    'ad.col.events': 'event', 'ad.col.quiz': 'question', 'ad.col.riddles': 'riddle', 'ad.col.challenges': 'challenge',
    'ad.f.title': 'Event name *', 'ad.f.date': 'Starts *', 'ad.f.endDate': 'Ends', 'ad.f.venue': 'Venue', 'ad.f.address': 'Location / address', 'ad.f.content': 'Details',
    'ad.f.record': 'Recap (fill in afterwards — shown under "Past events")', 'ad.f.question': 'Question *', 'ad.f.options': 'Options (tick the correct one)', 'ad.f.points': 'Points',
    'ad.f.riddleQ': 'Riddle *', 'ad.f.riddleA': 'Answer * (separate accepted answers with |, e.g. goal|net)', 'ad.f.hint': 'Hint', 'ad.f.chTitle': 'Challenge name *', 'ad.f.chDesc': 'Description', 'ad.f.active': 'Status',
    'ad.f.optReq': 'Option (required)', 'ad.f.optOpt': 'Option (optional)', 'ad.f.ansBlank': "The correct answer can't be blank", 'ad.open': '🟢 Open', 'ad.closed': '⚪ Closed',
    'ad.h.event': 'Event', 'ad.h.time': 'When', 'ad.h.venue': 'Venue', 'ad.h.going': 'Going', 'ad.h.question': 'Question', 'ad.h.answer': 'Answer', 'ad.h.points': 'Pts',
    'ad.h.riddle': 'Riddle', 'ad.h.riddleA': 'Answer', 'ad.h.challenge': 'Challenge', 'ad.h.status': 'Status', 'ad.h.member': 'Member', 'ad.h.content': 'Submission',
    'ad.h.nick': 'Nickname', 'ad.h.job': 'Room job', 'ad.h.lastSeen': 'Last seen',
    'ad.goingN': '{n}', 'ad.liveBtn': '⚡ Live quiz', 'ad.remindBtn': '📣 Remind', 'ad.quizHint': '"⚡ Live quiz" pushes the question to everyone online with a timer. Correct answers score, and the fastest gets +5.',
    'ad.eventHint': 'After an event, use "Edit" to add a recap. Members who set a reminder are notified 1 hour before; "📣 Remind" notifies them right away.',
    'ad.livePrompt': 'Push live quiz: "{q}"\nTime to answer (seconds, 10–120):', 'ad.liveSent': '⚡ Sent to everyone online', 'ad.reminded': 'Reminded {reached} online member(s) ({rsvp} set a reminder)',
    'ad.rsvpTitle': '{n} going / reminder set', 'ad.nobodyYet': 'Nobody yet',
    'ad.reviewTitle': '✅ LP Challenge review', 'ad.reviewHint': 'Approving adds the points automatically; revoking takes them back.', 'ad.noSubs': 'No submissions yet',
    'ad.st.pending': '⏳ Pending', 'ad.st.approved': '✅ Approved', 'ad.st.rejected': '❌ Rejected', 'ad.approve': 'Approve', 'ad.reject': 'Reject', 'ad.revoke': 'Revoke',
    'ad.usersTitle': '👥 Members ({n})', 'ad.noUsers': 'No members yet', 'ad.banned': '⛔ Disabled', 'ad.online': '🟢 Online', 'ad.offline': '⚪ Offline', 'ad.now': 'now',
    'ad.ban': 'Disable', 'ad.unban': 'Restore', 'ad.banConfirm': 'Disable "{name}"? They will be signed out immediately and can\'t come back in.',
    'ad.userDeleteConfirm': 'Permanently delete "{name}"? Their points, submissions and sign-in code will be removed. This can\'t be undone.', 'ad.editUser': 'Edit member', 'ad.noRoom': '—',
    'ad.announceTitle': '📢 Announcements', 'ad.announceHint': 'Announcements pop up for everyone online and show at the top of the town and in HQ.', 'ad.announcePh': 'e.g. Quiz Night at HQ tonight at 8pm — see you there!',
    'ad.publish': 'Publish', 'ad.published': 'Published 📢', 'ad.editAnnounce': 'Edit announcement',
    'ad.settingsTitle': '⚙️ Settings', 'ad.pwTitle': '🔑 Change backend password', 'ad.pwFromEnv': 'The password currently comes from the server\'s ADMIN_PASSWORD environment variable — change it there.',
    'ad.pwNew': 'New password (at least 8 characters)', 'ad.pwAgain': 'Type it again', 'ad.pwChange': 'Change password', 'ad.pwMismatch': "The two passwords don't match", 'ad.pwChanged': 'Password changed ✅',
    'ad.ago.now': 'just now', 'ad.ago.min': '{n} min ago', 'ad.ago.hour': '{n} h ago', 'ad.ago.day': '{n} days ago',
  };

  const DICTS = { zh, en };
  let lang = 'zh';
  try { const s = localStorage.getItem('lp258_lang'); if (s === 'en' || s === 'zh') lang = s; } catch {}

  function t(key, params) {
    let v = DICTS[lang][key];
    if (v === undefined) v = zh[key];
    if (v === undefined) return key;
    if (typeof v !== 'string' || !params) return v;
    return v.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  }
  function setLang(l) {
    try { localStorage.setItem('lp258_lang', l); } catch {}
    location.reload();
  }
  function apply(root = document) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    const ti = document.querySelector('title[data-i18n-doc]');
    if (ti) document.title = t(ti.dataset.i18nDoc);
  }
  const locale = () => (lang === 'zh' ? 'zh-CN' : 'en-GB');
  window.I18N = { t, setLang, apply, locale, get lang() { return lang; }, dicts: DICTS };
})();
