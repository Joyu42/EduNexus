"use client";

import { useState } from "react";
import {
  BookOpen,
  FileText,
  Users,
  Download,
  Plus,
  Search,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Eye
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Course = {
  id: string;
  name: string;
  subject: string;
  semester: string;
  studentCount: number;
  progress: number;
  status: "active" | "completed" | "draft";
  color: string;
};

type Assignment = {
  id: string;
  title: string;
  dueDate: string;
  submitted: number;
  total: number;
  status: "pending" | "grading" | "completed";
};

const mockCourses: Course[] = [
  {
    id: "1",
    name: "高等数学 A",
    subject: "数学",
    semester: "2026春季",
    studentCount: 45,
    progress: 68,
    status: "active",
    color: "bg-rose-500"
  },
  {
    id: "2",
    name: "线性代数",
    subject: "数学",
    semester: "2026春季",
    studentCount: 38,
    progress: 72,
    status: "active",
    color: "bg-amber-500"
  },
  {
    id: "3",
    name: "概率论与数理统计",
    subject: "数学",
    semester: "2026春季",
    studentCount: 42,
    progress: 55,
    status: "active",
    color: "bg-sky-500"
  }
];

const mockAssignments: Assignment[] = [
  { id: "1", title: "第三章习题集", dueDate: "2026-03-15", submitted: 32, total: 45, status: "pending" },
  { id: "2", title: "期中测验", dueDate: "2026-03-20", submitted: 28, total: 45, status: "grading" },
  { id: "3", title: "矩阵运算练习", dueDate: "2026-03-18", submitted: 38, total: 38, status: "completed" }
];

export default function TeacherPage() {
  const [selectedCourse, setSelectedCourse] = useState<Course>(mockCourses[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50">
      {/* 顶部快捷操作栏 */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 via-amber-600 to-sky-600 bg-clip-text text-transparent">
                教师工作台
              </h1>
              <p className="text-sm text-muted-foreground mt-1">管理课程、作业和学生表现</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <BookOpen className="mr-2 h-4 w-4" />
                新建课程
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                新建作业
              </Button>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                学生进度
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-rose-500 via-amber-500 to-sky-500 text-white">
                <Download className="mr-2 h-4 w-4" />
                导出报告
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：课程列表 */}
          <div className="col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">我的课程</CardTitle>
                <CardDescription>共 {mockCourses.length} 门课程</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 筛选器 */}
                <div className="space-y-2">
                  <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="学期" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部学期</SelectItem>
                      <SelectItem value="2026-spring">2026春季</SelectItem>
                      <SelectItem value="2025-fall">2025秋季</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="科目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部科目</SelectItem>
                      <SelectItem value="math">数学</SelectItem>
                      <SelectItem value="physics">物理</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="active">进行中</SelectItem>
                      <SelectItem value="completed">已完成</SelectItem>
                      <SelectItem value="draft">草稿</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 课程卡片列表 */}
                <div className="space-y-2 pt-2">
                  {mockCourses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourse(course)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedCourse.id === course.id
                          ? "border-rose-300 bg-rose-50/50 shadow-sm"
                          : "border-border bg-white hover:border-rose-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${course.color}`} />
                            <h3 className="font-medium text-sm">{course.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">{course.semester}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {course.status === "active" ? "进行中" : course.status === "completed" ? "已完成" : "草稿"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">学生数</span>
                          <span className="font-medium">{course.studentCount}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">进度</span>
                            <span className="font-medium">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中间：课程详情 */}
          <div className="col-span-6 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedCourse.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {selectedCourse.semester} · {selectedCourse.studentCount} 名学生
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    查看详情
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="plan">教学计划</TabsTrigger>
                    <TabsTrigger value="assignments">作业</TabsTrigger>
                    <TabsTrigger value="students">学生</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">总课时</p>
                              <p className="text-2xl font-bold mt-1">48</p>
                            </div>
                            <Calendar className="h-8 w-8 text-rose-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">已完成</p>
                              <p className="text-2xl font-bold mt-1">33</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-amber-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">剩余</p>
                              <p className="text-2xl font-bold mt-1">15</p>
                            </div>
                            <Clock className="h-8 w-8 text-sky-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">课程信息</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">课程代码：</span>
                            <span className="font-medium ml-2">MATH-2026-A</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">学分：</span>
                            <span className="font-medium ml-2">4.0</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">上课时间：</span>
                            <span className="font-medium ml-2">周二、周四 10:00-11:40</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">教室：</span>
                            <span className="font-medium ml-2">教学楼 A301</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="plan" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">教学计划</CardTitle>
                        <CardDescription>本学期教学安排</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { week: "第1-2周", topic: "函数与极限", status: "completed" },
                            { week: "第3-4周", topic: "导数与微分", status: "completed" },
                            { week: "第5-6周", topic: "微分中值定理", status: "active" },
                            { week: "第7-8周", topic: "不定积分", status: "pending" },
                            { week: "第9-10周", topic: "定积分", status: "pending" }
                          ].map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  item.status === "completed" ? "bg-green-500" :
                                  item.status === "active" ? "bg-amber-500" : "bg-gray-300"
                                }`} />
                                <div>
                                  <p className="font-medium text-sm">{item.topic}</p>
                                  <p className="text-xs text-muted-foreground">{item.week}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {item.status === "completed" ? "已完成" :
                                 item.status === "active" ? "进行中" : "未开始"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="assignments" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="搜索作业..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        新建作业
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {mockAssignments.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-medium">{assignment.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  截止日期：{assignment.dueDate}
                                </p>
                              </div>
                              <Badge variant={
                                assignment.status === "completed" ? "default" :
                                assignment.status === "grading" ? "secondary" : "outline"
                              }>
                                {assignment.status === "completed" ? "已完成" :
                                 assignment.status === "grading" ? "批改中" : "待提交"}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">提交进度</span>
                                <span className="font-medium">
                                  {assignment.submitted}/{assignment.total} ({Math.round(assignment.submitted / assignment.total * 100)}%)
                                </span>
                              </div>
                              <Progress value={assignment.submitted / assignment.total * 100} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="students" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">学生表现</CardTitle>
                        <CardDescription>班级学生学习情况概览</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { name: "张三", performance: 92, attendance: 95, assignments: 100 },
                            { name: "李四", performance: 88, attendance: 90, assignments: 95 },
                            { name: "王五", performance: 85, attendance: 88, assignments: 90 },
                            { name: "赵六", performance: 78, attendance: 85, assignments: 85 }
                          ].map((student, idx) => (
                            <div key={idx} className="p-3 rounded-lg border">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-medium">
                                    {student.name[0]}
                                  </div>
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">学号：2026{(idx + 1).toString().padStart(4, "0")}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">查看</Button>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">综合表现</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={student.performance} className="h-1 flex-1" />
                                    <span className="font-medium text-xs">{student.performance}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">出勤率</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={student.attendance} className="h-1 flex-1" />
                                    <span className="font-medium text-xs">{student.attendance}%</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">作业完成</p>
                                  <div className="flex items-center gap-2">
                                    <Progress value={student.assignments} className="h-1 flex-1" />
                                    <span className="font-medium text-xs">{student.assignments}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：统计面板 */}
          <div className="col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">学生活跃度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">今日活跃</span>
                    <span className="text-2xl font-bold">32</span>
                  </div>
                  <Progress value={71} />
                  <p className="text-xs text-muted-foreground">71% 学生今日在线学习</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">作业完成率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.87)}`}
                          className="text-amber-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">87%</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">已提交</span>
                      <span className="font-medium">39/45</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">待批改</span>
                      <span className="font-medium">12</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">知识点掌握度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { topic: "函数极限", mastery: 92, color: "bg-green-500" },
                    { topic: "导数计算", mastery: 85, color: "bg-sky-500" },
                    { topic: "微分应用", mastery: 78, color: "bg-amber-500" },
                    { topic: "积分运算", mastery: 65, color: "bg-rose-500" }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.topic}</span>
                        <span className="font-medium">{item.mastery}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all`}
                          style={{ width: `${item.mastery}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">问题热点</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { question: "洛必达法则的应用条件", count: 12, trend: "up" },
                    { question: "隐函数求导方法", count: 8, trend: "up" },
                    { question: "定积分的几何意义", count: 6, trend: "down" },
                    { question: "泰勒公式展开", count: 5, trend: "up" }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`mt-1 ${
                        item.trend === "up" ? "text-rose-500" : "text-green-500"
                      }`}>
                        {item.trend === "up" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.question}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.count} 名学生提问
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
