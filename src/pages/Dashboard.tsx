import { motion } from "framer-motion";
import {
  Users,
  Pill,
  Building2,
  FlaskConical,
  Calendar,
  ArrowUpRight,
  Activity,
  TrendingUp,
  Sparkles,
  Clock,
  Heart,
  CreditCard
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import MonthlyOverviewChart from "@/components/dashboard/MonthlyOverviewChart";
import YearlyTrendChart from "@/components/dashboard/YearlyTrendChart";
import TodayActivityChart from "@/components/dashboard/TodayActivityChart";
import RecentPatients from "@/components/dashboard/RecentPatients";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Database, AlertTriangle } from "lucide-react";

import { useState, useEffect } from "react";
import { sqlApi } from "@/lib/api";

const Dashboard = () => {
  const { user, role, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user, isAdmin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const stats = await sqlApi.dashboard.getStats();
        setDashboardData({
          mainStats: [
            { title: "Total Patients", value: stats.patients, change: "+12%", icon: Users, color: "primary", description: "Registered in system" },
            { title: "Medicine Records", value: stats.medicine, change: "+8%", icon: Pill, color: "info", description: "Prescriptions issued" },
            { title: "Hospital Visits", value: stats.hospital, change: "+5%", icon: Building2, color: "success", description: "External referrals" },
            { title: "Lab Tests", value: stats.lab, change: "+15%", icon: FlaskConical, color: "warning", description: "Diagnostics performed" },
          ],
          quickStats: [
            { label: "Daily Load", value: "High", icon: Activity, trend: "Stable" },
            { label: "Alerts", value: "0", icon: Clock, trend: "0" },
            { label: "Health Score", value: "98%", icon: Heart, trend: "+2%" },
          ],
          recentVisits: stats.recentActivities,
          storage: stats.storage
        });
      } else if (user?.empNo) {
        const userStats = await sqlApi.dashboard.getUserStats(user.empNo);
        setDashboardData({
          mainStats: [
            { title: "My Visits", value: userStats.visits, change: "", icon: Users, color: "primary", description: "Total center visits" },
            { title: "Medicine Used", value: `Rs. ${userStats.spent}`, change: "", icon: Pill, color: "info", description: "Total medicine value" },
            { title: "Medical Card", value: userStats.hasCard ? "Issued" : "Pending", change: "", icon: CreditCard, color: userStats.hasCard ? "success" : "warning", description: "Virtual card status" },
            { title: "Loyalty Points", value: "125", change: "+5", icon: Sparkles, color: "warning", description: "Points earned" },
          ],
          quickStats: [
            { label: "Upcoming", value: "0", icon: Calendar, trend: "0" },
            { label: "My Alerts", value: "0", icon: Clock, trend: "0" },
            { label: "My Health", value: "Good", icon: Heart, trend: "Stable" },
          ],
          recentVisits: userStats.recentVisits
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "🌅";
    if (hour < 17) return "☀️";
    return "🌙";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground animate-pulse font-medium">Personalizing your dashboard...</p>
      </div>
    );
  }

  const mainStats = dashboardData?.mainStats || [];
  const quickStats = dashboardData?.quickStats || [];

  return (
    <div className="space-y-8 pb-10">
      {/* DB Storage Alert for Admin */}
      {isAdmin && dashboardData?.storage?.isCritical && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="overflow-hidden"
        >
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Storage Warning!</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>
                Your database storage is <b>{dashboardData.storage.percentage}%</b> full
                ({dashboardData.storage.humanReadable} used of 500 MB).
                Please contact support to upgrade your limits before the system becomes read-only.
              </span>
              <div className="h-2 w-32 bg-destructive/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-destructive transition-all duration-1000"
                  style={{ width: `${Math.min(100, dashboardData.storage.percentage)}%` }}
                />
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Hero Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-section min-h-[300px] flex flex-col justify-center"
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-info/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-6 flex-1">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Sparkles className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">HealFlow Overview</span>
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight leading-tight">
                {getGreeting()},{" "}
                <span className="text-warning">
                  {user?.email?.split("@")[0] || "User"} {getGreetingEmoji()}
                </span>
              </h1>
              <p className="text-white/70 text-xl font-medium max-w-2xl leading-relaxed">
                Experience the next generation of medical management. Here's what's happening at your center today.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Badge
                variant="outline"
                className="bg-white/10 border-white/20 text-white capitalize px-6 py-2 text-sm font-semibold backdrop-blur-sm"
              >
                {role}
              </Badge>
              <div className="h-1 w-1 bg-white/30 rounded-full" />
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          <motion.div
            className="flex flex-col gap-4 min-w-[320px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
              {quickStats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl flex items-center justify-between hover:bg-white/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-white/60 font-medium uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-bold px-2 py-1 rounded-lg",
                    stat.trend.startsWith("+") ? "bg-success/20 text-success" :
                      stat.trend.startsWith("-") ? "bg-destructive/20 text-destructive" :
                        "bg-white/10 text-white/60"
                  )}>
                    {stat.trend}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Featured Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card flex items-center justify-between group cursor-pointer hover:border-primary/50 transition-all p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-500">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-lg">New Checkup</p>
              <p className="text-sm text-muted-foreground">Register a new patient</p>
            </div>
          </div>
          <Link to="/patients" className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
            <ArrowUpRight className="w-5 h-5 group-hover:text-white" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card flex items-center justify-between group cursor-pointer hover:border-success/50 transition-all p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center group-hover:bg-success group-hover:text-white transition-all duration-500">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-lg">Daily Reports</p>
              <p className="text-sm text-muted-foreground">View system performance</p>
            </div>
          </div>
          <Link to="/reports" className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-success group-hover:border-success transition-all">
            <ArrowUpRight className="w-5 h-5 group-hover:text-white" />
          </Link>
        </motion.div>

        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card flex items-center justify-between group cursor-pointer hover:border-info/50 transition-all p-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-info/10 flex items-center justify-center group-hover:bg-info group-hover:text-white transition-all duration-500">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-lg">Staff Directory</p>
                <p className="text-sm text-muted-foreground">Manage hospital staff</p>
              </div>
            </div>
            <Link to="/users" className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:bg-info group-hover:border-info transition-all">
              <ArrowUpRight className="w-5 h-5 group-hover:text-white" />
            </Link>
          </motion.div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {mainStats.map((stat: any, index: number) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.3 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="chart-card"
        >
          <MonthlyOverviewChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="chart-card"
        >
          <YearlyTrendChart />
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="chart-card"
        >
          <TodayActivityChart />
        </motion.div>
        <motion.div
          className="lg:col-span-2 chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <RecentPatients activities={dashboardData?.recentVisits} />
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
