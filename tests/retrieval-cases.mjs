// Hand-authored synthetic Chinese cases, not a sample of live users.
export const topIntents=[
 ['sleep-onset','sleep',['sleep-go-to-bed-sleepy'],['晚上躺着睡不着，有什么日常建议？','没有困意时要硬躺在床上吗？','入睡困难，怎样安排上床时间？']],
 ['wake-routine','sleep',['sleep-fixed-wake-time'],['睡懒觉会不会影响作息？','睡不好，周末几点起床合适？','想调整作息，起床时间要固定吗？']],
 ['sleep-stimulants','sleep',['sleep-evening-stimulants'],['睡前喝茶对睡眠有影响吗？','喝酒助眠靠谱吗？','下午喝咖啡，晚上睡不着怎么办？']],
 ['sleep-screens','sleep',['sleep-evening-screens'],['睡前刷手机会影响睡眠吗？','晚上刷视频到很晚，对睡觉有什么影响？','失眠时可以一直看电子产品吗？']],
 ['sleep-room','sleep',['sleep-dark-quiet'],['卧室太亮睡不好，可以怎么调整？','噪音总把我吵醒怎么办？','睡眠环境要注意什么？']],
 ['fatigue-explanation','fatigue',['a-fatigue-01'],['最近总没精神，疲劳可能有哪些原因？','什么原因会让人一直乏力？','总是累，能简单解释常见原因吗？']],
 ['fatigue-meals','fatigue',['a-fatigue-05'],['工作忙到忘吃饭，饿得没劲，日常怎么调整？','疲惫时，规律吃饭对精力有帮助吗？','经常疲劳又饮食不规律，先改什么？']],
 ['fatigue-consult','fatigue',['a-fatigue-02'],['累了好几周也不清楚原因，要去看医生吗？','疲劳已经影响工作，何时需要就医？','一直没精神，休息也不好，要不要做评估？']],
 ['bloating-meal','digest',['digest-bloating-chew','digest-bloating-small-meals'],['饭后肚子胀，吃饭方式可以怎么改？','总吃太快又饭后胀，怎么调整？','一顿吃撑容易胀气，怎么吃舒服一点？']],
 ['reflux-evening','digest',['digest-reflux-before-bed'],['夜里反酸，晚饭时间可以怎么调整？','烧心时睡前多久不吃东西？','反酸跟睡前吃饭有关吗？']],
 ['constipation-habit','digest',['digest-constipation-toilet-routine','digest-constipation-urge'],['便秘，平时有便意总忍着，可以怎么改？','排便困难，怎样养成规律的如厕习惯？','经常憋便又拉不出来，有什么日常建议？']],
 ['diarrhoea-drinks','digest',['digest-diarrhoea-juice-fizzy','digest-diarrhoea-small-sips'],['拉肚子时喝果汁可以吗？','腹泻有点恶心，水要怎么喝？','拉稀的时候喝汽水会不会不好？']],
 ['cycle-knowledge','women',['a-women-01'],['月经周期一定是28天吗？','大姨妈不是28天来一次就异常吗？','经期怎么算，通常隔多少天来一次？']],
 ['period-care','women',['a-women-05','a-women-06'],['姨妈肚子疼，想了解日常热敷。','痛经想试试热水袋，要注意什么？','经期可以散步这类温和运动吗？']],
 ['pms-diary','women',['a-women-10'],['经前症状记录需要记多久？','每月情绪波动，想做经期日记有什么建议？','PMS记录能给医生什么帮助？']],
 ['stress-small-steps','stress',['a-stress-01'],['压力大事情太多，先从哪里开始？','工作任务堆积，很有压力，怎么拆小目标？','忙不过来很紧张，日常如何安排任务？']],
 ['breathing-relaxation','stress',['a-stress-09','a-stress-10','a-stress-11','a-stress-12'],['紧张时怎么练习呼吸放松？','放松呼吸是不是越深越好？','想在办公室做温和呼吸练习，怎么坐？']],
 ['food-variety','wellness',['wellness-diet-variety'],['健康饮食有哪些基本原则？','日常均衡饮食怎么吃？','养生吃法一定要很复杂吗，怎么让食物多样？']],
 ['less-sitting','wellness',['wellness-activity-less-sitting'],['办公室坐一天，怎样减少久坐？','日常如何减少久坐？','久坐的人平时要留意什么？']],
 ['baduanjin-knowledge','movement',['wellness-baduanjin-breath','wellness-baduanjin-instruction'],['什么是八段锦？','八段锦的动作与呼吸是什么关系？','想学八段锦，哪里有正规教学？']]
];
export const retrievalCases=topIntents.flatMap(([id,topic,expectedIds,questions])=>questions.map((query,i)=>({id:`${id}-${i+1}`,intentGroup:id,query,topic,expectedIds})));
