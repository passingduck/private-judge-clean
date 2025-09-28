import Link from 'next/link';
import {
  SparklesIcon,
  ScaleIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  ArrowRightIcon,
  UserGroupIcon,
  LightBulbIcon,
  TrophyIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50 supports-backdrop-blur:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-xs sm:text-sm">PJ</span>
                </div>
                <span className="text-lg sm:text-xl font-bold text-gray-900">Private Judge</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/rooms"
                className="hidden sm:block text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                토론방
              </Link>
              <Link
                href="/login"
                className="px-3 py-2 sm:px-4 text-gray-600 hover:text-gray-900 font-medium transition-colors text-sm sm:text-base"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-3 py-2 sm:px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
              >
                시작하기
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12 sm:pb-16">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <SparklesIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              AI 기반 토론 플랫폼
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight px-2">
              AI와 함께하는
              <br />
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                지적 토론의 장
              </span>
            </h1>
            
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
              공정한 AI 심판과 다양한 관점의 배심원이 함께하는 체계적인 토론 플랫폼에서
              <br className="hidden sm:block" />
              당신의 논리력을 시험하고 새로운 관점을 발견해보세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 px-4">
              <Link
                href="/rooms/create"
                className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
              >
                토론방 만들기
                <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link
                href="/rooms"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex items-center justify-center"
              >
                <PlayIcon className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                데모 보기
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-2xl mx-auto px-4">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">1,000+</div>
                <div className="text-xs sm:text-sm text-gray-600">활성 사용자</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">5,000+</div>
                <div className="text-xs sm:text-sm text-gray-600">토론 세션</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">98%</div>
                <div className="text-xs sm:text-sm text-gray-600">만족도</div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">24/7</div>
                <div className="text-xs sm:text-sm text-gray-600">AI 지원</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              왜 Private Judge인가요?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              AI 기술과 체계적인 프로세스가 결합된 혁신적인 토론 경험을 제공합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="group p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <ScaleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                공정한 AI 심판
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                편견 없는 AI 심판이 논리적 근거와 증거를 바탕으로 객관적이고 공정하게 토론을 평가합니다.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                다양한 AI 배심원
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                서로 다른 관점과 전문성을 가진 AI 배심원들이 다각도로 토론을 분석하고 평가합니다.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl border border-purple-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <ChatBubbleLeftRightIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                체계적인 토론 과정
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                안건 협상부터 최종 판결까지 체계적이고 구조화된 토론 프로세스를 제공합니다.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl border border-orange-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <LightBulbIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                실시간 피드백
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                토론 진행 중 실시간으로 논리적 구조와 근거의 강약점에 대한 피드백을 제공합니다.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <ClipboardDocumentCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                상세한 분석 보고서
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                토론 종료 후 논리적 구조, 증거 활용, 반박 전략 등에 대한 상세한 분석 보고서를 제공합니다.
              </p>
            </div>

            <div className="group p-6 sm:p-8 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                <TrophyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                성장 추적 시스템
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                개인의 토론 실력 향상을 추적하고 맞춤형 학습 가이드를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              토론 진행 과정
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 px-4">
              간단한 4단계로 완성되는 체계적인 토론 경험
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {[
              {
                step: '01',
                title: '방 생성 및 참가',
                description: '토론방을 만들거나 기존 방에 참가합니다.',
                color: 'from-blue-500 to-indigo-600'
              },
              {
                step: '02',
                title: '안건 협상',
                description: '토론 주제와 세부 조건을 협의합니다.',
                color: 'from-green-500 to-emerald-600'
              },
              {
                step: '03',
                title: '주장 제출',
                description: '증거와 함께 논리적 주장을 작성합니다.',
                color: 'from-purple-500 to-violet-600'
              },
              {
                step: '04',
                title: 'AI 토론 및 판결',
                description: 'AI 심판과 배심원이 최종 판결을 내립니다.',
                color: 'from-orange-500 to-red-600'
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg`}>
                    <span className="text-white font-bold text-base sm:text-lg">{item.step}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-2">
                    {item.description}
                  </p>
                </div>
                {index < 3 && (
                  <div className="hidden lg:block absolute top-6 sm:top-8 left-full w-full">
                    <div className="w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-indigo-500 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 sm:mb-6">
            지금 바로 토론을 시작해보세요
          </h2>
          <p className="text-lg sm:text-xl text-indigo-100 mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
            논리적 사고력을 기르고 다양한 관점을 경험할 수 있는 최고의 토론 플랫폼이 여러분을 기다립니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/rooms"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-transparent text-white font-semibold rounded-xl border-2 border-white hover:bg-white hover:text-indigo-600 transition-all duration-200"
            >
              둘러보기
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 md:mb-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">PJ</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">Private Judge</span>
            </div>
            <div className="text-gray-400 text-xs sm:text-sm text-center">
              © 2024 Private Judge. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}