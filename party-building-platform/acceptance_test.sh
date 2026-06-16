#!/bin/bash
BASE="http://localhost:3000/api"

PASS=0
FAIL=0
TOTAL=0

check() {
  TOTAL=$((TOTAL+1))
  local name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS+1))
    echo "  ✅ $name"
  else
    FAIL=$((FAIL+1))
    echo "  ❌ $name (期望: $expected, 实际: $actual)"
  fi
}

check_code() {
  TOTAL=$((TOTAL+1))
  local name="$1"
  local result="$2"
  local code=$(echo "$result" | python3 -c "import sys,json;print(json.load(sys.stdin).get('code','N/A'))" 2>/dev/null || echo "N/A")
  if [ "$code" = "200" ]; then
    PASS=$((PASS+1))
    echo "  ✅ $name (code=$code)"
  else
    FAIL=$((FAIL+1))
    echo "  ❌ $name (code=$code)"
    echo "     响应: $result"
  fi
}

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         党建平台 MySQL 模式联调验收测试                   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

echo "前置检查：确认使用 MySQL，无 JSON 文件..."
if [ ! -f data/db.json ]; then
  echo "  ✅ 无 JSON 数据库文件"
else
  echo "  ❌ 发现 JSON 数据库文件！"
  exit 1
fi
if mysql -u root -e "USE party_building; SELECT 1" >/dev/null 2>&1; then
  echo "  ✅ MySQL 数据库正常"
else
  echo "  ❌ MySQL 数据库不可用"
  exit 1
fi
echo ""
echo "数据库模式: MySQL（严格模式 DB_TYPE=mysql，连接失败直接退出）"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                      1. 鉴权模块"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "1.1 用户注册"
REG_RESULT=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"username":"验收测试","password":"123456","real_name":"验收测试用户","phone":"13800000099","branch":"测试党支部"}')
check_code "注册接口返回 200" "$REG_RESULT"
NEW_USER_ID=$(echo "$REG_RESULT" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['user']['id'] if d.get('data') and d['data'].get('user') else 'N/A')")
echo "    新用户 ID: $NEW_USER_ID"

echo ""
echo "  验证 MySQL 中是否写入..."
DB_COUNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.users WHERE username='验收测试'")
check "MySQL 用户表新增记录" "1" "$DB_COUNT"

echo ""
echo "1.2 用户登录（zhangsan）"
LOGIN_RES=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"zhangsan","password":"user123"}')
check_code "登录接口返回 200" "$LOGIN_RES"
USER_TOKEN=$(echo "$LOGIN_RES" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
USER_ID=$(echo "$LOGIN_RES" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user']['id'])")
check "登录返回 token（非空）" "has_token" $( [ -n "$USER_TOKEN" ] && echo "has_token" || echo "no_token" )
echo "    token: ${USER_TOKEN:0:30}..."

echo ""
echo "1.3 管理员登录"
ADMIN_RES=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}')
check_code "管理员登录返回 200" "$ADMIN_RES"
ADMIN_TOKEN=$(echo "$ADMIN_RES" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
ADMIN_ROLE=$(echo "$ADMIN_RES" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user']['role'])")
check "管理员角色正确" "admin" "$ADMIN_ROLE"

echo ""
echo "1.4 获取个人信息"
PROFILE=$(curl -s -H "Authorization: Bearer $USER_TOKEN" $BASE/auth/profile)
check_code "获取个人信息返回 200" "$PROFILE"
PROFILE_NAME=$(echo "$PROFILE" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['real_name'])")
PROFILE_BRANCH=$(echo "$PROFILE" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['branch'])")
check "个人信息 - 姓名" "张三" "$PROFILE_NAME"
check "个人信息 - 支部" "第一党支部" "$PROFILE_BRANCH"

echo ""
echo "1.5 更新个人信息"
UPDATE_PROFILE=$(curl -s -X PUT -H "Authorization: Bearer $USER_TOKEN" $BASE/auth/profile \
  -H "Content-Type: application/json" -d '{"phone":"13999999999"}')
check_code "更新个人信息返回 200" "$UPDATE_PROFILE"
UPDATED_PHONE=$(echo "$UPDATE_PROFILE" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['phone'])")
check "更新后手机号" "13999999999" "$UPDATED_PHONE"
echo "  验证 MySQL..."
DB_PHONE=$(mysql -u root -N -e "SELECT phone FROM party_building.users WHERE id=$USER_ID")
check "MySQL 中手机号已更新" "13999999999" "$DB_PHONE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    2. 学习专栏模块"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "2.1 文章列表（分页）"
ARTICLES=$(curl -s "$BASE/articles?page=1&page_size=3")
check_code "文章列表返回 200" "$ARTICLES"
ART_TOTAL=$(echo "$ARTICLES" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
ART_COUNT=$(echo "$ARTICLES" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['list']))")
check "文章总数 >= 6" "yes" $( [ "$ART_TOTAL" -ge 6 ] && echo "yes" || echo "no" )
check "单页数量 3" "3" "$ART_COUNT"

echo ""
echo "2.2 文章分类筛选"
ART_CAT=$(curl -s "$BASE/articles?category=%E7%90%86%E8%AE%BA%E5%AD%A6%E4%B9%A0&page_size=10")
check_code "分类筛选返回 200" "$ART_CAT"
CAT_COUNT=$(echo "$ART_CAT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
cats = [a['category'] for a in d['data']['list']]
print('all_ok' if all(c=='理论学习' for c in cats) else 'bad')
")
check "返回文章都属于理论学习" "all_ok" "$CAT_COUNT"

echo ""
echo "2.3 关键词搜索（二十大）"
ART_SEARCH=$(curl -s "$BASE/articles?keyword=%E4%BA%8C%E5%8D%81%E5%A4%A7")
check_code "关键词搜索返回 200" "$ART_SEARCH"
SEARCH_TOTAL=$(echo "$ART_SEARCH" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
check "搜索结果 >= 1" "yes" $( [ "$SEARCH_TOTAL" -ge 1 ] && echo "yes" || echo "no" )

echo ""
echo "2.4 文章分类列表"
CATS=$(curl -s $BASE/articles/categories)
check_code "分类列表返回 200" "$CATS"
CAT_LIST=$(echo "$CATS" | python3 -c "import sys,json;print(','.join(json.load(sys.stdin)['data']))")
check "分类包含 理论学习" "yes" $(echo "$CAT_LIST" | grep -q "理论学习" && echo "yes" || echo "no" )
check "分类包含 党史学习" "yes" $(echo "$CAT_LIST" | grep -q "党史学习" && echo "yes" || echo "no" )

echo ""
echo "2.5 文章详情（自动累加阅读量）"
OLD_VIEWS=$(mysql -u root -N -e "SELECT views FROM party_building.articles WHERE id=1")
ART_DETAIL=$(curl -s $BASE/articles/1)
check_code "文章详情返回 200" "$ART_DETAIL"
NEW_VIEWS=$(mysql -u root -N -e "SELECT views FROM party_building.articles WHERE id=1")
check "阅读量自动 +1" "yes" $( [ "$NEW_VIEWS" -eq $((OLD_VIEWS + 1)) ] && echo "yes" || echo "no (old:$OLD_VIEWS, new:$NEW_VIEWS)" )

echo ""
echo "2.6 记录阅读，获得积分（阅读 >=30 秒，首次阅读 +2 积分）"
OLD_POINTS=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
OLD_RECORDS=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.study_records WHERE user_id=$USER_ID AND article_id=3")
READ=$(curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" "$BASE/articles/3/read" \
  -H "Content-Type: application/json" -d '{"duration": 80}')
check_code "记录阅读返回 200" "$READ"
NEW_POINTS=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
NEW_RECORDS=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.study_records WHERE user_id=$USER_ID AND article_id=3")
POINTS_EARNED=$(echo "$READ" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['points_earned'] if d.get('data') else 0)")
check "积分 +2" "yes" $( [ "$NEW_POINTS" -eq $((OLD_POINTS + 2)) ] && echo "yes" || echo "no (old:$OLD_POINTS, new:$NEW_POINTS)" )
check "学习记录 +1" "yes" $( [ "$NEW_RECORDS" -eq $((OLD_RECORDS + 1)) ] && echo "yes" || echo "no" )
check "积分记录新增 1 条（学习文章）" "yes" $(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.points_records WHERE user_id=$USER_ID AND reason LIKE '%学习文章%'" | grep -q "^2$" && echo "yes" || echo "no")

echo ""
echo "2.7 重复阅读同一篇文章（不重复加分）"
OLD_POINTS2=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
READ2=$(curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" "$BASE/articles/3/read" \
  -H "Content-Type: application/json" -d '{"duration": 80}')
check_code "重复阅读返回 200" "$READ2"
NEW_POINTS2=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
POINTS_EARNED2=$(echo "$READ2" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['data']['points_earned'] if d.get('data') else 0)")
check "积分不增加" "yes" $( [ "$NEW_POINTS2" -eq "$OLD_POINTS2" ] && echo "yes" || echo "no" )
check "points_earned 为 0" "0" "$POINTS_EARNED2"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    3. 活动报名模块"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "3.1 活动列表"
ACTS=$(curl -s "$BASE/activities?page_size=5")
check_code "活动列表返回 200" "$ACTS"
ACT_TOTAL=$(echo "$ACTS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
check "活动总数 >= 6" "yes" $( [ "$ACT_TOTAL" -ge 6 ] && echo "yes" || echo "no" )

echo ""
echo "3.2 活动状态筛选"
ACTS_UPCOMING=$(curl -s "$BASE/activities?status=upcoming")
check_code "状态筛选返回 200" "$ACTS_UPCOMING"
UPCOMING_STATUS=$(echo "$ACTS_UPCOMING" | python3 -c "
import sys,json
d=json.load(sys.stdin)
statuses = set(a['status'] for a in d['data']['list'])
print('ok' if statuses == {'upcoming'} else 'bad: '+str(statuses))
")
check "筛选结果都是 upcoming" "ok" "$UPCOMING_STATUS"

echo ""
echo "3.3 活动详情（未登录时不返回报名状态）"
ACT_DETAIL=$(curl -s "$BASE/activities/2")
check_code "活动详情返回 200" "$ACT_DETAIL"
DETAIL_HAS_SIGNUP=$(echo "$ACT_DETAIL" | python3 -c "import sys,json;d=json.load(sys.stdin);print('yes' if 'is_signed_up' in d['data'] else 'no')")
check "未登录无 is_signed_up 字段" "no" "$DETAIL_HAS_SIGNUP"
echo "    （登录用户才可查看自己的报名状态，游客也能看活动详情）"

echo ""
echo "3.4 活动详情（登录后含报名状态）"
ACT_DETAIL_AUTH=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/activities/2")
check_code "活动详情（带认证）返回 200" "$ACT_DETAIL_AUTH"
AUTH_HAS_SIGNUP=$(echo "$ACT_DETAIL_AUTH" | python3 -c "import sys,json;d=json.load(sys.stdin);print('yes' if 'is_signed_up' in d['data'] else 'no')")
check "登录后有 is_signed_up 字段" "yes" "$AUTH_HAS_SIGNUP"

echo ""
echo "3.5 活动报名"
OLD_SIGNUP_COUNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.activity_signups WHERE activity_id=2 AND status != 'cancelled'")
SIGNUP=$(curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" "$BASE/activities/2/signup")
check_code "报名接口返回 200" "$SIGNUP"
NEW_SIGNUP_COUNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.activity_signups WHERE activity_id=2 AND status != 'cancelled'")
SIGNUP_STATUS=$(mysql -u root -N -e "SELECT status FROM party_building.activity_signups WHERE user_id=$USER_ID AND activity_id=2 ORDER BY id DESC LIMIT 1")
check "报名记录 +1（排除 cancelled）" "yes" $( [ "$NEW_SIGNUP_COUNT" -eq $((OLD_SIGNUP_COUNT + 1)) ] && echo "yes" || echo "no (old:$OLD_SIGNUP_COUNT, new:$NEW_SIGNUP_COUNT)" )
check "报名状态为 pending" "pending" "$SIGNUP_STATUS"

echo ""
echo "3.6 我的活动列表"
MY_ACTS=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/activities/my/list")
check_code "我的活动返回 200" "$MY_ACTS"
MY_ACT_COUNT=$(echo "$MY_ACTS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
check "我的活动数 >= 1" "yes" $( [ "$MY_ACT_COUNT" -ge 1 ] && echo "yes" || echo "no" )

echo ""
echo "3.7 重复报名（应失败）"
DUP_SIGNUP=$(curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" "$BASE/activities/2/signup")
DUP_CODE=$(echo "$DUP_SIGNUP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('code','N/A'))")
check "重复报名返回 400" "400" "$DUP_CODE"

echo ""
echo "3.8 取消报名"
CANCEL=$(curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" "$BASE/activities/2/cancel")
check_code "取消报名返回 200" "$CANCEL"
CANCEL_STATUS=$(mysql -u root -N -e "SELECT status FROM party_building.activity_signups WHERE user_id=$USER_ID AND activity_id=2 ORDER BY id DESC LIMIT 1")
check "MySQL 中状态变为 cancelled" "cancelled" "$CANCEL_STATUS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    4. 积分排行模块"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "4.1 积分排行榜"
RANK=$(curl -s "$BASE/points/ranking?page_size=5")
check_code "排行榜返回 200" "$RANK"
RANK_TOTAL=$(echo "$RANK" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
check "排行总人数 >= 5" "yes" $( [ "$RANK_TOTAL" -ge 5 ] && echo "yes" || echo "no" )
RANK_ORDER=$(echo "$RANK" | python3 -c "
import sys,json
d=json.load(sys.stdin)
points = [u['points'] for u in d['data']['list']]
print('desc' if points == sorted(points, reverse=True) else 'bad')
")
check "按积分降序排列" "desc" "$RANK_ORDER"
RANK_FIELD=$(echo "$RANK" | python3 -c "
import sys,json
d=json.load(sys.stdin)
has_rank = all('rank' in u for u in d['data']['list'])
print('yes' if has_rank else 'no')
")
check "每条记录有 rank 字段" "yes" "$RANK_FIELD"

echo ""
echo "4.2 按支部筛选"
RANK_BRANCH=$(curl -s "$BASE/points/ranking?branch=%E7%AC%AC%E4%B8%80%E5%85%9A%E6%94%AF%E9%83%A8")
check_code "支部筛选返回 200" "$RANK_BRANCH"
BRANCH_CHECK=$(echo "$RANK_BRANCH" | python3 -c "
import sys,json
d=json.load(sys.stdin)
branches = set(u['branch'] for u in d['data']['list'])
print('ok' if branches == {'第一党支部'} else 'bad: '+str(branches))
")
check "筛选结果都是第一党支部" "ok" "$BRANCH_CHECK"

echo ""
echo "4.3 支部列表"
BRANCHES=$(curl -s $BASE/points/branches)
check_code "支部列表返回 200" "$BRANCHES"
BRANCH_LIST=$(echo "$BRANCHES" | python3 -c "import sys,json;print(','.join(json.load(sys.stdin)['data']))")
check "包含第一党支部" "yes" $(echo "$BRANCH_LIST" | grep -q "第一党支部" && echo "yes" || echo "no")

echo ""
echo "4.4 我的积分记录"
MY_RECORDS=$(curl -s -H "Authorization: Bearer $USER_TOKEN" "$BASE/points/my-records?page_size=10")
check_code "我的积分记录返回 200" "$MY_RECORDS"
MY_REC_TOTAL=$(echo "$MY_RECORDS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
MY_TOTAL_POINTS=$(echo "$MY_RECORDS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total_points'])")
DB_POINTS=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
DB_REC_COUNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.points_records WHERE user_id=$USER_ID")
check "记录总数匹配 MySQL" "$DB_REC_COUNT" "$MY_REC_TOTAL"
check "总积分匹配 MySQL" "$DB_POINTS" "$MY_TOTAL_POINTS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    5. 支部通知模块"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "5.1 通知列表"
NOTICES=$(curl -s "$BASE/notices?page_size=5")
check_code "通知列表返回 200" "$NOTICES"
NOTICE_TOTAL=$(echo "$NOTICES" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
check "通知总数 >= 6" "yes" $( [ "$NOTICE_TOTAL" -ge 6 ] && echo "yes" || echo "no" )

echo ""
echo "5.2 通知类型筛选"
NOTICE_TYPE=$(curl -s "$BASE/notices?type=%E5%B7%A5%E4%BD%9C%E9%80%9A%E7%9F%A5")
check_code "类型筛选返回 200" "$NOTICE_TYPE"
TYPE_CHECK=$(echo "$NOTICE_TYPE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
types = set(n['type'] for n in d['data']['list'])
print('ok' if types == {'工作通知'} else 'bad: '+str(types))
")
check "筛选结果都是工作通知" "ok" "$TYPE_CHECK"

echo ""
echo "5.3 通知优先级排序"
NOTICE_PRIORITY=$(echo "$NOTICES" | python3 -c "
import sys,json
d=json.load(sys.stdin)
priorities = [n['priority'] for n in d['data']['list']]
print('desc' if priorities == sorted(priorities, reverse=True) else 'bad: '+str(priorities))
")
check "按优先级降序排列" "desc" "$NOTICE_PRIORITY"

echo ""
echo "5.4 通知类型列表"
NOTICE_TYPES=$(curl -s $BASE/notices/types)
check_code "通知类型返回 200" "$NOTICE_TYPES"
TYPE_LIST=$(echo "$NOTICE_TYPES" | python3 -c "import sys,json;print(','.join(json.load(sys.stdin)['data']))")
check "包含工作通知" "yes" $(echo "$TYPE_LIST" | grep -q "工作通知" && echo "yes" || echo "no")

echo ""
echo "5.5 通知详情"
NOTICE_DETAIL=$(curl -s $BASE/notices/1)
check_code "通知详情返回 200" "$NOTICE_DETAIL"
NOTICE_TITLE=$(echo "$NOTICE_DETAIL" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['title'])")
DB_TITLE=$(mysql -u root -N -e "SELECT title FROM party_building.notices WHERE id=1")
check "标题匹配 MySQL" "$DB_TITLE" "$NOTICE_TITLE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                    6. 后台管理模块"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "6.1 数据统计"
STATS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/stats)
check_code "统计接口返回 200" "$STATS"
STAT_USERS=$(echo "$STATS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['user_count'])")
STAT_ARTICLES=$(echo "$STATS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['article_count'])")
DB_USERS=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.users WHERE role='user'")
DB_USERS_ALL=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.users")
DB_ARTICLES=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.articles")
check "普通用户数匹配 MySQL（排除admin）" "$DB_USERS" "$STAT_USERS"
echo "    说明：接口统计 role='user' 的用户（$DB_USERS 个），总用户 $DB_USERS_ALL 个（含 1 个 admin）"
check "文章数匹配 MySQL" "$DB_ARTICLES" "$STAT_ARTICLES"

echo ""
echo "6.2 普通用户访问后台（应被拒绝）"
USER_STATS=$(curl -s -H "Authorization: Bearer $USER_TOKEN" $BASE/admin/stats)
USER_STATS_CODE=$(echo "$USER_STATS" | python3 -c "import sys,json;print(json.load(sys.stdin).get('code','N/A'))")
check "普通用户访问后台返回 403" "403" "$USER_STATS_CODE"

echo ""
echo "6.3 文章管理 - 列表"
ADMIN_ART=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/articles?page_size=3")
check_code "后台文章列表返回 200" "$ADMIN_ART"

echo ""
echo "6.4 文章管理 - 新增"
OLD_ART_COUNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.articles")
NEW_ART=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/articles \
  -H "Content-Type: application/json" \
  -d '{"title":"验收测试文章","content":"这是验收测试的内容","category":"理论学习","author":"验收员","cover_image":"https://example.com/test.jpg"}')
check_code "新增文章返回 200" "$NEW_ART"
NEW_ART_ID=$(echo "$NEW_ART" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
NEW_ART_COUNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.articles")
check "文章数 +1" "yes" $( [ "$NEW_ART_COUNT" -eq $((OLD_ART_COUNT + 1)) ] && echo "yes" || echo "no" )
DB_ART_TITLE=$(mysql -u root -N -e "SELECT title FROM party_building.articles WHERE id=$NEW_ART_ID")
check "MySQL 中标题正确" "验收测试文章" "$DB_ART_TITLE"

echo ""
echo "6.5 文章管理 - 更新（含 views 字段）"
UPD_ART=$(curl -s -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/articles/$NEW_ART_ID" \
  -H "Content-Type: application/json" -d '{"title":"更新后的验收测试文章","views":999}')
check_code "更新文章返回 200" "$UPD_ART"
DB_UPD_TITLE=$(mysql -u root -N -e "SELECT title FROM party_building.articles WHERE id=$NEW_ART_ID")
DB_VIEWS=$(mysql -u root -N -e "SELECT views FROM party_building.articles WHERE id=$NEW_ART_ID")
check "MySQL 中标题已更新" "更新后的验收测试文章" "$DB_UPD_TITLE"
check "MySQL 中阅读量已更新" "999" "$DB_VIEWS"

echo ""
echo "6.6 文章管理 - 删除"
DEL_ART=$(curl -s -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/articles/$NEW_ART_ID")
check_code "删除文章返回 200" "$DEL_ART"
DEL_EXISTS=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.articles WHERE id=$NEW_ART_ID")
check "MySQL 中已删除" "0" "$DEL_EXISTS"

echo ""
echo "6.7 活动报名名单"
SIGNUP_LIST=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/activity-signups/1")
check_code "报名名单返回 200" "$SIGNUP_LIST"
SIGNUP_LIST_CNT=$(echo "$SIGNUP_LIST" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']['list']))")
DB_SIGNUP_CNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.activity_signups WHERE activity_id=1")
check "报名人数匹配 MySQL（含全部状态）" "$DB_SIGNUP_CNT" "$SIGNUP_LIST_CNT"

echo ""
echo "6.8 审核报名（通过，活动奖励 20 积分）"
curl -s -X POST -H "Authorization: Bearer $USER_TOKEN" "$BASE/activities/4/signup" >/dev/null
PENDING_ID=$(mysql -u root -N -e "SELECT id FROM party_building.activity_signups WHERE user_id=$USER_ID AND activity_id=4 AND status='pending' ORDER BY id DESC LIMIT 1")
echo "    待审核记录 ID: $PENDING_ID"
OLD_USER_POINTS=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
APPR_SIGNUP=$(curl -s -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/activity-signups/$PENDING_ID/status" \
  -H "Content-Type: application/json" -d '{"status":"approved"}')
check_code "审核通过返回 200" "$APPR_SIGNUP"
APPROVED_STATUS=$(mysql -u root -N -e "SELECT status FROM party_building.activity_signups WHERE id=$PENDING_ID")
check "MySQL 状态为 approved" "approved" "$APPROVED_STATUS"
NEW_USER_POINTS=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
POINTS_DIFF=$((NEW_USER_POINTS - OLD_USER_POINTS))
check "审核通过奖励积分 +10" "yes" $( [ "$POINTS_DIFF" -eq 10 ] && echo "yes" || echo "no (old:$OLD_USER_POINTS, new:$NEW_USER_POINTS, diff:$POINTS_DIFF, 活动4奖励10分)" )
check "积分记录新增 1 条（活动奖励）" "yes" $(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.points_records WHERE user_id=$USER_ID AND reason LIKE '%活动%'" | grep -q "^2$" && echo "yes" || echo "no")

echo ""
echo "6.9 用户列表（仅普通用户）"
ADMIN_USERS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users?page_size=20")
check_code "用户列表返回 200" "$ADMIN_USERS"
USER_TOTAL=$(echo "$ADMIN_USERS" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['total'])")
check "用户数匹配 MySQL（普通用户）" "$DB_USERS" "$USER_TOTAL"
echo "    说明：后台用户列表仅展示 role='user' 的普通用户，不包含 admin"

echo ""
echo "6.10 调整用户积分"
OLD_P=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
ADJ_POINTS=$(curl -s -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/users/$USER_ID/points" \
  -H "Content-Type: application/json" -d '{"points":50,"reason":"管理员奖励测试"}')
check_code "调整积分返回 200" "$ADJ_POINTS"
NEW_P=$(mysql -u root -N -e "SELECT points FROM party_building.users WHERE id=$USER_ID")
check "积分 +50" "yes" $( [ "$NEW_P" -eq $((OLD_P + 50)) ] && echo "yes" || echo "no (old:$OLD_P, new:$NEW_P)" )

echo ""
echo "6.11 通知管理 - 新增"
OLD_NOTICE_CNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.notices")
NEW_NOTICE=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" $BASE/admin/notices \
  -H "Content-Type: application/json" \
  -d '{"title":"验收测试通知","content":"验收通知内容","type":"工作通知","priority":2}')
check_code "新增通知返回 200" "$NEW_NOTICE"
NEW_NOTICE_ID=$(echo "$NEW_NOTICE" | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")
NEW_NOTICE_CNT=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.notices")
check "通知数 +1" "yes" $( [ "$NEW_NOTICE_CNT" -eq $((OLD_NOTICE_CNT + 1)) ] && echo "yes" || echo "no" )

echo ""
echo "6.12 通知管理 - 删除"
DEL_NOTICE=$(curl -s -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE/admin/notices/$NEW_NOTICE_ID")
check_code "删除通知返回 200" "$DEL_NOTICE"
NOTICE_EXISTS=$(mysql -u root -N -e "SELECT COUNT(*) FROM party_building.notices WHERE id=$NEW_NOTICE_ID")
check "MySQL 中通知已删除" "0" "$NOTICE_EXISTS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "                          总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  通过: $PASS / $TOTAL"
echo "  失败: $FAIL / $TOTAL"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "  ✅ 全部测试通过！"
  echo ""
  echo "  数据库模式: MySQL（严格模式 DB_TYPE=mysql，不回退到 JSON）"
  echo "  JSON 文件: 不存在（正确）"
  echo "  后端服务: 运行中 (http://localhost:3000)"
  exit 0
else
  echo "  ❌ 有 $FAIL 个测试失败"
  exit 1
fi
